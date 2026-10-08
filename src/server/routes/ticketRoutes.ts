import { Router, Response } from 'express';
import { db } from '../../db/index.ts';
import { tickets, ticketEvents, users, comments, attachments } from '../../db/schema.ts';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest, requireRole } from '../middleware/auth.ts';

const router = Router();

// Allowed values
const VALID_CATEGORIES = new Set([
  'Account / Access',
  'API / Integration',
  'Configuration',
  'Performance',
  'Data',
  'Application Error',
  'General',
]);

const VALID_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

const VALID_STATUSES = new Set([
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
]);

// Status transition matrix
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'OPEN', 'CLOSED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS', 'OPEN'],
  CLOSED: ['IN_PROGRESS', 'OPEN'],
};

// GET /api/tickets - List tickets with search and filters
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      search,
      status,
      priority,
      category,
      assignee,
      limit = '50',
      offset = '0',
    } = req.query;

    const conditions: any[] = [];

    // RBAC: Requester sees only their own tickets
    if (user.role === 'REQUESTER') {
      conditions.push(eq(tickets.requesterId, user.id));
    }

    // Search filter: ticket_number or subject
    if (search && typeof search === 'string' && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(ilike(tickets.ticketNumber, q), ilike(tickets.subject, q))
      );
    }

    // Status filter
    if (status && typeof status === 'string' && VALID_STATUSES.has(status)) {
      conditions.push(eq(tickets.status, status));
    }

    // Priority filter
    if (priority && typeof priority === 'string' && VALID_PRIORITIES.has(priority)) {
      conditions.push(eq(tickets.priority, priority));
    }

    // Category filter
    if (category && typeof category === 'string' && VALID_CATEGORIES.has(category)) {
      conditions.push(eq(tickets.category, category));
    }

    // Assignee filter
    if (assignee && typeof assignee === 'string') {
      if (assignee === 'unassigned') {
        conditions.push(sql`${tickets.assigneeId} IS NULL`);
      } else if (assignee === 'me') {
        conditions.push(eq(tickets.assigneeId, user.id));
      } else {
        const parsedAssigneeId = parseInt(assignee, 10);
        if (!isNaN(parsedAssigneeId)) {
          conditions.push(eq(tickets.assigneeId, parsedAssigneeId));
        }
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Join with requester and assignee user names
    const query = db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        description: tickets.description,
        category: tickets.category,
        priority: tickets.priority,
        status: tickets.status,
        affectedModule: tickets.affectedModule,
        errorMessage: tickets.errorMessage,
        aiSummary: tickets.aiSummary,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        resolvedAt: tickets.resolvedAt,
        closedAt: tickets.closedAt,
        requester: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.requesterId, users.id))
      .where(whereClause)
      .orderBy(desc(tickets.createdAt))
      .limit(Math.min(parseInt(limit as string, 10) || 50, 100))
      .offset(parseInt(offset as string, 10) || 0);

    const ticketList = await query;

    // Fetch assignee names for the tickets that have assigneeId
    const assigneeIds = ticketList
      .map((t) => t.id)
      .filter(Boolean);

    // Let's also do a fast lookup for assignee names
    const ticketsWithAssignees = await Promise.all(
      ticketList.map(async (t) => {
        const [rawTicket] = await db
          .select({ assigneeId: tickets.assigneeId })
          .from(tickets)
          .where(eq(tickets.id, t.id))
          .limit(1);

        let assignee = null;
        if (rawTicket?.assigneeId) {
          const [u] = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, rawTicket.assigneeId))
            .limit(1);
          assignee = u || null;
        }

        return {
          ...t,
          assignee,
        };
      })
    );

    return res.json({ tickets: ticketsWithAssignees });
  } catch (error: any) {
    console.error('Error listing tickets:', error);
    return res.status(500).json({ error: 'Failed to retrieve tickets' });
  }
});

// GET /api/tickets/:id - Get ticket details + comments + attachments + history
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // RBAC: Requester cannot view someone else's ticket
    if (user.role === 'REQUESTER' && ticket.requesterId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot access tickets raised by other users' });
    }

    // Get requester profile
    const [requester] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, ticket.requesterId))
      .limit(1);

    // Get assignee profile if assigned
    let assignee = null;
    if (ticket.assigneeId) {
      const [assUser] = await db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, ticket.assigneeId))
        .limit(1);
      assignee = assUser || null;
    }

    // Get comments
    const ticketComments = await db
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

    // Get attachments
    const ticketAttachments = await db
      .select({
        id: attachments.id,
        ticketId: attachments.ticketId,
        uploadedBy: attachments.uploadedBy,
        originalName: attachments.originalName,
        storedName: attachments.storedName,
        filePath: attachments.filePath,
        fileType: attachments.fileType,
        fileSize: attachments.fileSize,
        createdAt: attachments.createdAt,
        uploaderName: users.name,
      })
      .from(attachments)
      .innerJoin(users, eq(attachments.uploadedBy, users.id))
      .where(eq(attachments.ticketId, ticketId))
      .orderBy(attachments.createdAt);

    // Get ticket timeline events
    const timeline = await db
      .select({
        id: ticketEvents.id,
        ticketId: ticketEvents.ticketId,
        userId: ticketEvents.userId,
        eventType: ticketEvents.eventType,
        oldValue: ticketEvents.oldValue,
        newValue: ticketEvents.newValue,
        createdAt: ticketEvents.createdAt,
        userName: users.name,
        userRole: users.role,
      })
      .from(ticketEvents)
      .innerJoin(users, eq(ticketEvents.userId, users.id))
      .where(eq(ticketEvents.ticketId, ticketId))
      .orderBy(desc(ticketEvents.createdAt));

    return res.json({
      ticket: {
        ...ticket,
        requester,
        assignee,
      },
      comments: ticketComments,
      attachments: ticketAttachments.map((a) => ({
        ...a,
        fileUrl: `/uploads/${a.storedName}`,
      })),
      history: timeline,
    });
  } catch (error: any) {
    console.error('Error fetching ticket details:', error);
    return res.status(500).json({ error: 'Failed to retrieve ticket details' });
  }
});

// POST /api/tickets - Guided creation form
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      subject,
      description,
      category,
      priority = 'MEDIUM',
      tryingToDo,
      expectedResult,
      actualResult,
      errorMessage,
      affectedModule,
      attemptedSolution,
    } = req.body;

    // Required fields validation
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({ error: 'Problem title (subject) is required' });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'Problem description is required' });
    }
    if (!category || !VALID_CATEGORIES.has(category)) {
      return res.status(400).json({
        error: `Category is required and must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}`,
      });
    }

    const cleanPriority = VALID_PRIORITIES.has(priority) ? priority : 'MEDIUM';

    // Generate unique ticket number (e.g. SF-1009)
    const countResult = await db.select({ count: sql<number>`count(*)::int` }).from(tickets);
    const count = countResult[0]?.count || 0;
    const ticketNumber = `SF-${1000 + count + 1}`;

    // Use transaction for ticket creation + event history consistency
    const newTicket = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(tickets)
        .values({
          ticketNumber,
          requesterId: user.id,
          subject: subject.trim(),
          description: description.trim(),
          category,
          priority: cleanPriority,
          status: 'OPEN',
          tryingToDo: tryingToDo?.trim() || null,
          expectedResult: expectedResult?.trim() || null,
          actualResult: actualResult?.trim() || null,
          errorMessage: errorMessage?.trim() || null,
          affectedModule: affectedModule?.trim() || null,
          attemptedSolution: attemptedSolution?.trim() || null,
        })
        .returning();

      // Record CREATED history event
      await tx.insert(ticketEvents).values({
        ticketId: inserted.id,
        userId: user.id,
        eventType: 'CREATED',
        oldValue: null,
        newValue: `Ticket created with priority ${cleanPriority} in category ${category}`,
      });

      return inserted;
    });

    return res.status(201).json({
      message: 'Support ticket raised successfully',
      ticket: newTicket,
    });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// PATCH /api/tickets/:id/status - Status transitions with strict validation
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const ticketId = parseInt(req.params.id, 10);
    const { status: targetStatus, comment } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    if (!targetStatus || !VALID_STATUSES.has(targetStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`,
      });
    }

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Requester authorization check
    if (user.role === 'REQUESTER') {
      if (ticket.requesterId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You cannot modify this ticket' });
      }

      // Requesters can only transition a RESOLVED ticket to CLOSED, or reopen if issue persists
      if (targetStatus === 'CLOSED' && ticket.status !== 'RESOLVED') {
        return res.status(400).json({
          error: 'Only resolved tickets can be closed by the requester.',
        });
      }
      if (targetStatus !== 'CLOSED' && targetStatus !== 'IN_PROGRESS') {
        return res.status(403).json({
          error: 'Requesters may only close resolved tickets or reopen to In Progress.',
        });
      }
    }

    const currentStatus = ticket.status;
    if (currentStatus === targetStatus) {
      return res.json({ message: 'Ticket already in this status', ticket });
    }

    // Verify valid status workflow transition (Admins can transition to any valid status)
    if (user.role !== 'ADMIN') {
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(targetStatus)) {
        return res.status(400).json({
          error: `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed transitions from ${currentStatus}: ${allowedNext.join(', ') || 'None'}`,
        });
      }
    }

    // Perform status update & event creation in transaction
    const updated = await db.transaction(async (tx) => {
      const updateData: any = {
        status: targetStatus,
        updatedAt: new Date(),
      };

      if (targetStatus === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      } else if (targetStatus === 'CLOSED') {
        updateData.closedAt = new Date();
      }

      const [resTicket] = await tx
        .update(tickets)
        .set(updateData)
        .where(eq(tickets.id, ticketId))
        .returning();

      // Record STATUS_CHANGED event
      await tx.insert(ticketEvents).values({
        ticketId,
        userId: user.id,
        eventType: 'STATUS_CHANGED',
        oldValue: currentStatus,
        newValue: targetStatus,
      });

      // If user supplied a resolution/status comment
      if (comment && typeof comment === 'string' && comment.trim()) {
        await tx.insert(comments).values({
          ticketId,
          userId: user.id,
          body: comment.trim(),
        });
      }

      return resTicket;
    });

    return res.json({
      message: `Status updated to ${targetStatus}`,
      ticket: updated,
    });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

// PATCH /api/tickets/:id/priority - Priority update (Agents & Admins)
router.patch(
  '/:id/priority',
  requireAuth,
  requireRole(['SUPPORT_AGENT', 'ADMIN']),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = parseInt(req.params.id, 10);
      const { priority: newPriority } = req.body;

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'Invalid ticket ID' });
      }

      if (!newPriority || !VALID_PRIORITIES.has(newPriority)) {
        return res.status(400).json({
          error: `Priority must be one of: ${Array.from(VALID_PRIORITIES).join(', ')}`,
        });
      }

      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const oldPriority = ticket.priority;
      if (oldPriority === newPriority) {
        return res.json({ message: 'Priority unchanged', ticket });
      }

      const updated = await db.transaction(async (tx) => {
        const [resTicket] = await tx
          .update(tickets)
          .set({ priority: newPriority, updatedAt: new Date() })
          .where(eq(tickets.id, ticketId))
          .returning();

        await tx.insert(ticketEvents).values({
          ticketId,
          userId: user.id,
          eventType: 'PRIORITY_CHANGED',
          oldValue: oldPriority,
          newValue: newPriority,
        });

        return resTicket;
      });

      return res.json({
        message: `Priority changed from ${oldPriority} to ${newPriority}`,
        ticket: updated,
      });
    } catch (error: any) {
      console.error('Error updating priority:', error);
      return res.status(500).json({ error: 'Failed to update priority' });
    }
  }
);

// PATCH /api/tickets/:id/assign - Assign or unassign agent (Agents & Admins)
router.patch(
  '/:id/assign',
  requireAuth,
  requireRole(['SUPPORT_AGENT', 'ADMIN']),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = parseInt(req.params.id, 10);
      let { assigneeId } = req.body;

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'Invalid ticket ID' });
      }

      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      let newAssigneeName = 'Unassigned';
      let targetAssigneeId: number | null = null;

      if (assigneeId !== null && assigneeId !== undefined) {
        targetAssigneeId = parseInt(assigneeId, 10);
        if (isNaN(targetAssigneeId)) {
          return res.status(400).json({ error: 'Invalid assignee ID' });
        }

        // Verify target assignee is a SUPPORT_AGENT or ADMIN
        const [targetUser] = await db
          .select({ id: users.id, name: users.name, role: users.role })
          .from(users)
          .where(eq(users.id, targetAssigneeId))
          .limit(1);

        if (!targetUser || targetUser.role === 'REQUESTER') {
          return res.status(400).json({
            error: 'Tickets can only be assigned to Support Agents or Administrators',
          });
        }

        newAssigneeName = targetUser.name;
      }

      // Find old assignee name
      let oldAssigneeName = 'Unassigned';
      if (ticket.assigneeId) {
        const [oldUser] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, ticket.assigneeId))
          .limit(1);
        if (oldUser) oldAssigneeName = oldUser.name;
      }

      const updated = await db.transaction(async (tx) => {
        const [resTicket] = await tx
          .update(tickets)
          .set({ assigneeId: targetAssigneeId, updatedAt: new Date() })
          .where(eq(tickets.id, ticketId))
          .returning();

        await tx.insert(ticketEvents).values({
          ticketId,
          userId: user.id,
          eventType: 'ASSIGNED',
          oldValue: oldAssigneeName,
          newValue: newAssigneeName,
        });

        return resTicket;
      });

      return res.json({
        message: `Ticket assigned to ${newAssigneeName}`,
        ticket: updated,
      });
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      return res.status(500).json({ error: 'Failed to assign ticket' });
    }
  }
);

export default router;
