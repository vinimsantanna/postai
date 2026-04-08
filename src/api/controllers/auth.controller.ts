import type { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { validateCpf } from '@/lib/cpf';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  cpf: z.string()
    .regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'Invalid CPF format')
    .refine(validateCpf, 'Invalid CPF'),
  plan: z.enum([
    'CREATOR_STARTER', 'CREATOR_PRO', 'CREATOR_FULL',
    'BUSINESS_PLAY', 'BUSINESS_ENTERPRISE', 'AGENCY_SYMPHONY',
  ]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      return;
    }

    try {
      const result = await authService.register(parsed.data);
      res.status(201).json(result);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      return;
    }

    try {
      const result = await authService.login(parsed.data);
      res.json(result);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'refreshToken required' });
      return;
    }

    try {
      const result = await authService.refresh(parsed.data.refreshToken);
      res.json(result);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken).catch(() => null);
    }
    res.status(204).send();
  },
};
