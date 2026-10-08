import { Router, Response } from 'express';
import { db } from '../../db/index.ts';
import { comments, tickets, ticketEvents, users } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

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

    const list = await db
      .select({
        id: comments.id,
        ticketId: comments.ticketId,
        userId: comments.userId,
        body: comments.body,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        userName: users.name,
        userRole: users.role,
        userEmail: users.email,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.ticketId, ticketId))
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
    const { body } = req.body;

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

    const newComment = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(comments)
        .values({
          ticketId,
          userId: user.id,
          body: body.trim(),
        })
        .returning();

      // Record ticket event
      await tx.insert(ticketEvents).values({
        ticketId,
        userId: user.id,
        eventType: 'COMMENT_ADDED',
        oldValue: null,
        newValue: `${user.role === 'REQUESTER' ? 'Requester' : 'Support agent'} added response`,
      });

      // Update ticket's updatedAt timestamp
      await tx
        .update(tickets)
        .set({ updatedAt: new Date() })
        .where(eq(tickets.id, ticketId));

      return inserted;
    });

    return res.status(201).json({
      message: 'Comment added',
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
