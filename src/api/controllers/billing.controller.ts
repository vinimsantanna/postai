import type { Request, Response } from 'express';
import { z } from 'zod';
import { billingService } from '@/services/billing.service';
import type { AuthRequest } from '@/api/middleware/auth.middleware';
import type { Plan } from '@prisma/client';

const checkoutSchema = z.object({
  plan: z.enum([
    'CREATOR_STARTER', 'CREATOR_PRO', 'CREATOR_FULL',
    'BUSINESS_PLAY', 'BUSINESS_ENTERPRISE',
    'AGENCY_SYMPHONY',
  ]),
});

export const billingController = {
  async getPlans(_req: Request, res: Response): Promise<void> {
    const plans = await billingService.getPlansWithPrices();
    res.json({ plans });
  },

  async createCheckout(req: AuthRequest, res: Response): Promise<void> {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid plan', details: parsed.error.flatten() });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';

    try {
      const result = await billingService.createCheckoutSession(
        req.user!.id,
        parsed.data.plan as Plan,
        `${frontendUrl}/billing/success`,
        `${frontendUrl}/billing/cancelled`,
      );
      res.json(result);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      res.status(error.status ?? 500).json({ error: error.message });
    }
  },

  async createPortal(req: AuthRequest, res: Response): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';

    try {
      const result = await billingService.createPortalSession(
        req.user!.id,
        `${frontendUrl}/dashboard`,
      );
      res.json(result);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      res.status(error.status ?? 500).json({ error: error.message });
    }
  },

  async webhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    try {
      const result = await billingService.handleWebhook(req.body as Buffer, signature);
      res.json(result);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      res.status(error.status ?? 500).json({ error: error.message });
    }
  },
};
