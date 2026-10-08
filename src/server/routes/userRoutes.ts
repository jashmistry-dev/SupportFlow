import { Router, Response } from 'express';
import { db } from '../../db/index.ts';
import { users, tickets } from '../../db/schema.ts';
import { eq, or, desc, sql, and } from 'drizzle-orm';
import { requireAuth, AuthRequest, requireRole, UserRole } from '../middleware/auth.ts';

const router = Router();

// GET /api/users/profile - Fetch authenticated user profile & stats from database
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user!;

    const [userRecord] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!userRecord) {
      return res.status(404).json({ error: 'User profile not found in database' });
    }

    // Real database ticket stats
    const createdStats = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.requesterId, authUser.id));

    const assignedStats = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.assigneeId, authUser.id));

    const resolvedStats = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(
        and(
          eq(tickets.assigneeId, authUser.id),
          sql`${tickets.status} IN ('RESOLVED', 'CLOSED')`
        )
      );

    return res.json({
      user: userRecord,
      stats: {
        createdCount: createdStats[0]?.count ?? 0,
        assignedCount: assignedStats[0]?.count ?? 0,
        resolvedCount: resolvedStats[0]?.count ?? 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// GET /api/users/me - Alias for /profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user!;

    const [userRecord] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!userRecord) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.json({ user: userRecord });
  } catch (error: any) {
    console.error('Error fetching user me:', error);
    return res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// GET /api/users/agents - Fetch all agents & admins (available to authenticated users for assigning)
router.get('/agents', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const agentList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(or(eq(users.role, 'SUPPORT_AGENT'), eq(users.role, 'ADMIN')))
      .orderBy(users.name);

    return res.json({ agents: agentList });
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({ error: 'Failed to retrieve agent list' });
  }
});

// GET /api/users - Admin manage users
router.get('/', requireAuth, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return res.json({ users: allUsers });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// PATCH /api/users/:id/role - Admin change role
router.patch(
  '/:id/role',
  requireAuth,
  requireRole(['ADMIN']),
  async (req: AuthRequest, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      const { role } = req.body;

      if (isNaN(targetUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      if (!role || !['REQUESTER', 'SUPPORT_AGENT', 'ADMIN'].includes(role)) {
        return res.status(400).json({
          error: 'Role must be REQUESTER, SUPPORT_AGENT, or ADMIN',
        });
      }

      const [updated] = await db
        .update(users)
        .set({ role: role as UserRole, updatedAt: new Date() })
        .where(eq(users.id, targetUserId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        });

      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ message: 'User role updated successfully', user: updated });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      return res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

export default router;
