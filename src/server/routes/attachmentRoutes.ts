import { Router, Response } from 'express';
import { db } from '../../db/index.ts';
import { attachments, tickets, ticketEvents } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { upload } from '../middleware/upload.ts';
import { storageService } from '../storage/storageService.ts';
import { config } from '../config.ts';

const router = Router();

// POST /api/tickets/:id/attachments (Multipart upload up to 5 files)
router.post(
  '/tickets/:id/attachments',
  requireAuth,
  upload.array('files', 5),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = parseInt(req.params.id, 10);

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'Invalid ticket ID' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided for upload' });
      }

      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      if (user.role === 'REQUESTER' && ticket.requesterId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You cannot upload files to this ticket' });
      }

      const savedAttachments = [];

      for (const file of files) {
        // Enforce strict size check per category
        const isImage = config.allowedImageMimes.includes(file.mimetype);
        const isVideo = config.allowedVideoMimes.includes(file.mimetype);

        if (isImage && file.size > config.maxImageSize) {
          return res.status(400).json({
            error: `Image ${file.originalname} exceeds the 5MB size limit.`,
          });
        }

        if (isVideo && file.size > config.maxVideoSize) {
          return res.status(400).json({
            error: `Video ${file.originalname} exceeds the 25MB size limit.`,
          });
        }

        const saved = await storageService.saveFile(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        const [record] = await db
          .insert(attachments)
          .values({
            ticketId,
            uploadedBy: user.id,
            originalName: file.originalname,
            storedName: saved.storedName,
            filePath: saved.filePath,
            fileType: file.mimetype,
            fileSize: file.size,
          })
          .returning();

        // Record event
        await db.insert(ticketEvents).values({
          ticketId,
          userId: user.id,
          eventType: 'ATTACHMENT_ADDED',
          oldValue: null,
          newValue: `Uploaded ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`,
        });

        savedAttachments.push({
          ...record,
          fileUrl: saved.fileUrl,
        });
      }

      // Update ticket updatedAt
      await db
        .update(tickets)
        .set({ updatedAt: new Date() })
        .where(eq(tickets.id, ticketId));

      return res.status(201).json({
        message: 'Evidence attachment(s) uploaded successfully',
        attachments: savedAttachments,
      });
    } catch (error: any) {
      console.error('Error uploading attachments:', error);
      return res.status(500).json({ error: error.message || 'Failed to process attachment upload' });
    }
  }
);

// DELETE /api/attachments/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const attachmentId = parseInt(req.params.id, 10);

    if (isNaN(attachmentId)) {
      return res.status(400).json({ error: 'Invalid attachment ID' });
    }

    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId))
      .limit(1);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Only uploader, support agent, or admin can delete
    if (user.role === 'REQUESTER' && attachment.uploadedBy !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete this attachment' });
    }

    // Delete file from disk
    await storageService.deleteFile(attachment.storedName);

    // Delete record
    await db.delete(attachments).where(eq(attachments.id, attachmentId));

    return res.json({ message: 'Attachment removed successfully' });
  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    return res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

export default router;
