import { Router } from 'express';
import express from 'express';
import { billingController } from '@/api/controllers/billing.controller';
import { requireAuth } from '@/api/middleware/auth.middleware';

const router = Router();

// Public
router.get('/plans', billingController.getPlans);

// Stripe webhook — needs raw body, NOT json parser
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  billingController.webhook,
);

// Authenticated
router.post('/checkout', requireAuth, billingController.createCheckout);
router.post('/portal', requireAuth, billingController.createPortal);

export default router;
