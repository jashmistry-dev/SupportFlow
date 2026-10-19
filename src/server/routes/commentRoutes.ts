import { Router, type Response } from 'express';
import { db } from '../../db/index.ts';
import { comments, tickets, ticketEvents, users } from '../../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/tickets/:id/comments
router.get('/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const [ticket] = await db
      .select({ requesterId: tickets.requesterId })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (user.role === 'REQUESTER' && ticket.requesterId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot access this ticket' });
    }

    // Strict RBAC: Requesters can only see public comments (isInternal = false)
    const commentConditions = [eq(comments.ticketId, ticketId)];
    if (user.role === 'REQUESTER') {
      commentConditions.push(eq(comments.isInternal, false));
    }

    const list = await db
      .select({
        id: comments.id,
        ticketId: comments.ticketId,
        userId: comments.userId,
        body: comments.body,
        isInternal: comments.isInternal,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        userName: users.name,
        userRole: users.role,
        userEmail: users.email,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(and(...commentConditions))
      .orderBy(comments.createdAt);

    return res.json({ comments: list });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Failed to retrieve comments' });
  }
});

// POST /api/tickets/:id/comments
router.post('/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const ticketId = parseInt(req.params.id, 10);
    const { body, isInternal } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({ error: 'Comment message cannot be empty' });
    }

    if (body.trim().length > 5000) {
      return res.status(400).json({ error: 'Comment must not exceed 5,000 characters' });
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
      return res.status(403).json({ error: 'Forbidden: You cannot comment on this ticket' });
    }

    // Only agents and admins can create internal-only notes
    const canCreateInternal = user.role === 'SUPPORT_AGENT' || user.role === 'ADMIN';
    const finalIsInternal = canCreateInternal ? Boolean(isInternal) : false;

    const newComment = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(comments)
        .values({
          ticketId,
          userId: user.id,
          body: body.trim(),
          isInternal: finalIsInternal,
        })
        .returning();

      // Record ticket event with internal/public distinction
      await tx.insert(ticketEvents).values({
        ticketId,
        userId: user.id,
        eventType: 'COMMENT_ADDED',
        oldValue: finalIsInternal ? 'INTERNAL' : 'PUBLIC',
        newValue: finalIsInternal
          ? `${user.role === 'ADMIN' ? 'Admin' : 'Support agent'} added internal note`
          : `${user.role === 'REQUESTER' ? 'Requester' : 'Support agent'} added response`,
      });

      // Update ticket's updatedAt timestamp
      await tx
        .update(tickets)
        .set({ updatedAt: new Date() })
        .where(eq(tickets.id, ticketId));

      return inserted;
    });

    return res.status(201).json({
      message: finalIsInternal ? 'Internal note added' : 'Comment added',
      comment: {
        ...newComment,
        userName: user.name,
        userRole: user.role,
        userEmail: user.email,
      },
    });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ error: 'Failed to post comment' });
  }
});

export default router;
