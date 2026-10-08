import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.ts';
import { users } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { config } from '../config.ts';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

// Initialize Firebase Admin if not already initialized
if (!getApps().length && firebaseConfig?.projectId) {
  try {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } catch (err) {
    console.warn('Firebase Admin initialization warning:', err);
  }
}

export type UserRole = 'REQUESTER' | 'SUPPORT_AGENT' | 'ADMIN';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // 1. Try standard SupportFlow JWT verification first
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: number;
      email: string;
      role: UserRole;
    };

    const [userRecord] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (!userRecord) {
      return res.status(401).json({ error: 'Unauthorized: User no longer exists' });
    }

    req.user = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role as UserRole,
    };
    return next();
  } catch (jwtErr) {
    // 2. Fallback to Firebase ID Token verification if applicable
    if (getApps().length) {
      try {
        const decodedFb = await getAuth().verifyIdToken(token);
        if (decodedFb && decodedFb.email) {
          // Check if user exists in DB or find/create
          const [userRecord] = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
            })
            .from(users)
            .where(eq(users.email, decodedFb.email))
            .limit(1);

          if (userRecord) {
            req.user = {
              id: userRecord.id,
              name: userRecord.name,
              email: userRecord.email,
              role: userRecord.role as UserRole,
            };
            return next();
          }
        }
      } catch (fbErr) {
        // Both failed
      }
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Access restricted to roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}
