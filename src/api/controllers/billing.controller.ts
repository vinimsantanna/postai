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

  checkoutSuccess(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PostAI — Conta Ativa!</title></head>
<body style="font-family:sans-serif;background:#f0fdf4;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="background:#fff;border-radius:16px;padding:40px;max-width:440px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="font-size:56px;margin-bottom:16px">🎉</div>
    <h1 style="color:#16a34a;margin:0 0 12px;font-size:24px">Pagamento confirmado!</h1>
    <p style="color:#555;margin:0 0 24px">Em instantes você receberá um email com as instruções para ativar o bot no WhatsApp.</p>
    <div style="background:#25d366;color:#fff;border-radius:10px;padding:16px;margin:0 0 16px">
      <p style="margin:0 0 4px;font-size:13px;opacity:.9">Adicione no WhatsApp:</p>
      <p style="margin:0;font-size:20px;font-weight:700">+55 71 98303-0021</p>
      <p style="margin:6px 0 0;font-size:12px;opacity:.85">Salve como <strong>PostAI</strong> e envie seu CPF</p>
    </div>
    <p style="color:#aaa;font-size:12px;margin:0">Dúvidas? Entre em contato: suporte@postai.app</p>
  </div>
</body>
</html>`);
  },

  checkoutCancelled(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PostAI — Pagamento cancelado</title></head>
<body style="font-family:sans-serif;background:#fef2f2;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="background:#fff;border-radius:16px;padding:40px;max-width:440px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="font-size:56px;margin-bottom:16px">😕</div>
    <h1 style="color:#dc2626;margin:0 0 12px;font-size:24px">Pagamento cancelado</h1>
    <p style="color:#555;margin:0 0 24px">Sem problemas! Você pode tentar novamente quando quiser.</p>
    <p style="color:#aaa;font-size:12px;margin:0">Dúvidas? Entre em contato: suporte@postai.app</p>
  </div>
</body>
</html>`);
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
