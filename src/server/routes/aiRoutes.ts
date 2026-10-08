import { Router, Response } from 'express';
import { db } from '../../db/index.ts';
import { tickets, comments, ticketEvents, users } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { generateTicketAISummary } from '../services/aiService.ts';

const router = Router();

// POST /api/tickets/:id/ai-summary
router.post(
  '/:id/ai-summary',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const ticketId = parseInt(req.params.id, 10);

    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket ID',
        message: 'Invalid ticket ID',
      });
    }

    try {
      const user = req.user!;

      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
          message: 'Ticket not found',
        });
      }

      // Check authorization: Requesters can only summarize their own tickets; Agents/Admins can summarize any
      if (user.role === 'REQUESTER' && ticket.requesterId !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot access tickets raised by other users',
          message: 'Forbidden: You cannot access tickets raised by other users',
        });
      }

      // Gather conversation comments
      const ticketComments = await db
        .select({
          userName: users.name,
          role: users.role,
          body: comments.body,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.ticketId, ticketId))
        .orderBy(comments.createdAt);

      try {
        const aiSummary = await generateTicketAISummary({
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          tryingToDo: ticket.tryingToDo,
          expectedResult: ticket.expectedResult,
          actualResult: ticket.actualResult,
          errorMessage: ticket.errorMessage,
          affectedModule: ticket.affectedModule,
          attemptedSolution: ticket.attemptedSolution,
          comments: ticketComments,
        });

        const summaryJsonString = JSON.stringify(aiSummary);

        // Save AI summary to database
        await db
          .update(tickets)
          .set({
            aiSummary: summaryJsonString,
            aiGeneratedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tickets.id, ticketId));

        // Add history event
        await db.insert(ticketEvents).values({
          ticketId,
          userId: user.id,
          eventType: 'AI_SUMMARY_GENERATED',
          oldValue: null,
          newValue: `${user.name} (${user.role}) generated advisory Gemini ticket summary`,
        });

        return res.status(200).json({
          success: true,
          summary: aiSummary,
        });
      } catch (aiError: any) {
        console.error('[aiRoutes] AI summary processing error for ticket #', ticketId, ':', aiError?.message || aiError);
        return res.status(503).json({
          success: false,
          error: 'AI summary is temporarily unavailable. Please try again.',
          message: 'AI summary is temporarily unavailable. Please try again.',
        });
      }
    } catch (routeError: any) {
      console.error('[aiRoutes] Route handler error for ticket #', ticketId, ':', routeError?.message || routeError);
      return res.status(500).json({
        success: false,
        error: 'Failed to process AI summary request.',
        message: 'Failed to process AI summary request.',
      });
    }
  }
);

export default router;
