import { Router } from 'express';
import { webhookController } from '@/api/controllers/webhook.controller';
import { webhookLimiter } from '@/api/middleware/rate-limit.middleware';

const router = Router();

// Evolution API sends events here
router.post('/whatsapp', webhookLimiter, webhookController.handleWhatsapp);

export default router;
