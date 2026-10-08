import { Router, Response } from 'express';
import { db } from '../../db/index.ts';
import { tickets, users } from '../../db/schema.ts';
import { eq, or, desc, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const isRequester = user.role === 'REQUESTER';

    // Base condition for requester
    const baseCondition = isRequester ? eq(tickets.requesterId, user.id) : undefined;

    // Aggregate status counts
    const statusCountsRaw = await db
      .select({
        status: tickets.status,
        count: sql<number>`count(*)::int`,
      })
      .from(tickets)
      .where(baseCondition)
      .groupBy(tickets.status);

    const counts: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_FOR_REQUESTER: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    statusCountsRaw.forEach((row) => {
      counts[row.status] = row.count;
    });

    // Count urgent + high priority
    const priorityCountsRaw = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(tickets)
      .where(
        baseCondition
          ? sql`${tickets.requesterId} = ${user.id} AND (${tickets.priority} = 'URGENT' OR ${tickets.priority} = 'HIGH')`
          : or(eq(tickets.priority, 'URGENT'), eq(tickets.priority, 'HIGH'))
      );

    const urgentOrHighCount = priorityCountsRaw[0]?.count || 0;

    // Total tickets count
    const totalCount =
      counts.OPEN +
      counts.IN_PROGRESS +
      counts.WAITING_FOR_REQUESTER +
      counts.RESOLVED +
      counts.CLOSED;

    // Recent 10 tickets
    const recentTickets = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        priority: tickets.priority,
        status: tickets.status,
        category: tickets.category,
        updatedAt: tickets.updatedAt,
        createdAt: tickets.createdAt,
        requester: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.requesterId, users.id))
      .where(baseCondition)
      .orderBy(desc(tickets.updatedAt))
      .limit(10);

    // Look up assignees
    const recentWithAssignees = await Promise.all(
      recentTickets.map(async (t) => {
        const [raw] = await db
          .select({ assigneeId: tickets.assigneeId })
          .from(tickets)
          .where(eq(tickets.id, t.id))
          .limit(1);

        let assignee = null;
        if (raw?.assigneeId) {
          const [u] = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, raw.assigneeId))
            .limit(1);
          assignee = u || null;
        }

        return {
          ...t,
          assignee,
        };
      })
    );

    return res.json({
      summary: {
        total: totalCount,
        open: counts.OPEN,
        inProgress: counts.IN_PROGRESS,
        waitingForRequester: counts.WAITING_FOR_REQUESTER,
        resolved: counts.RESOLVED,
        closed: counts.CLOSED,
        urgentOrHigh: urgentOrHighCount,
      },
      recentTickets: recentWithAssignees,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard summary' });
  }
});

export default router;
