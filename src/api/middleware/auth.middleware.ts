import type { Request, Response, NextFunction } from 'express';
import { authService } from '@/services/auth.service';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; plan: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = authService.verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, plan: payload.plan };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
