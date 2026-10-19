import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../../db/index.ts';
import { users } from '../../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { config } from '../config.ts';
import { requireAuth, type AuthRequest, type UserRole } from '../middleware/auth.ts';

const router = Router();

function verifySetupKey(candidate: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const candTrim = candidate.trim();
  const candBuf = Buffer.from(candTrim);
  const expBuf = Buffer.from(config.adminSetupKey);
  if (candBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(candBuf, expBuf);
}

// GET /api/auth/setup-status - Check if any administrator accounts exist
router.get('/setup-status', async (_req, res: Response) => {
  try {
    const adminCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'ADMIN'));
    const totalAdmins = adminCount[0]?.count ?? 0;
    return res.json({
      hasAdmin: totalAdmins > 0,
      adminCount: totalAdmins,
    });
  } catch (error: any) {
    console.error('Setup status error:', error);
    return res.status(500).json({ error: 'Failed to check setup status' });
  }
});

// POST /api/auth/setup-admin - Securely promote an existing account to ADMIN using the Admin Setup Key
router.post('/setup-admin', async (req: AuthRequest, res: Response) => {
  try {
    const { email, setupKey } = req.body;

    if (!setupKey || typeof setupKey !== 'string' || !setupKey.trim()) {
      return res.status(400).json({ error: 'Admin setup key is required' });
    }

    if (!verifySetupKey(setupKey)) {
      return res.status(403).json({
        error: 'Invalid admin setup key. Ordinary users cannot promote themselves to administrator.',
      });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (!userRecord) {
      return res.status(404).json({
        error: `Account for "${cleanEmail}" does not exist. Please register an account first.`,
      });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ role: 'ADMIN', updatedAt: new Date() })
      .where(eq(users.id, userRecord.id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    const token = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Account successfully promoted to Administrator',
      token,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Admin promotion error:', error);
    return res.status(500).json({ error: 'Failed to complete admin promotion' });
  }
});

// POST /api/auth/register - Secure registration
router.post('/register', async (req, res: Response) => {
  try {
    const { name, email, password, role, setupKey } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Role assignment security:
    // Ordinary users can only register as REQUESTER or SUPPORT_AGENT.
    // Registering as ADMIN requires the protected setupKey.
    let assignedRole: UserRole = 'REQUESTER';
    if (role === 'SUPPORT_AGENT') {
      assignedRole = 'SUPPORT_AGENT';
    } else if (role === 'ADMIN') {
      if (setupKey && typeof setupKey === 'string' && verifySetupKey(setupKey)) {
        assignedRole = 'ADMIN';
      } else {
        return res.status(403).json({
          error: 'Administrator registration requires a valid Admin Setup Key. Ordinary users cannot register as Admin.',
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: assignedRole,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: newUser,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (!userRecord) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, userRecord.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: userRecord.id, email: userRecord.email, role: userRecord.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to process login' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  return res.json({ user: req.user });
});

export default router;
