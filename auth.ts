import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

const TOKEN_SECRET = process.env.SESSION_SECRET || 'portoassist-dev-secret-key-2026';

export type UserRole = 'PASSENGER' | 'HELPER';

export interface AuthPayload {
  userId: number;
  email: string;
  role: UserRole;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthPayload;
}

export function signToken(payload: Omit<AuthPayload, 'exp'>): string {
  const fullPayload: AuthPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, sig] = parts;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as AuthPayload;
    if (decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload || (payload.role !== 'PASSENGER' && payload.role !== 'HELPER')) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }

  const userRow = db
    .prepare('SELECT id, role, COALESCE(account_status, \'ACTIVE\') as account_status FROM users WHERE id = ?')
    .get(payload.userId) as { id: number; role: string; account_status: string } | undefined;

  if (!userRow || (userRow.role !== 'PASSENGER' && userRow.role !== 'HELPER')) {
    res.status(401).json({ error: 'Account no longer exists or is unauthorized.' });
    return;
  }
  if (userRow.account_status === 'BLOCKED') {
    res.status(403).json({ error: 'This account has been blocked due to automated safety reports.' });
    return;
  }

  req.auth = payload;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: `Access denied for role ${req.auth.role}` });
      return;
    }
    next();
  };
}
