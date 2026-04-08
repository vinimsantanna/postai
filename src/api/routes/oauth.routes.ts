import { Router } from 'express';
import { requireAuth } from '@/api/middleware/auth.middleware';
import { oauthController } from '@/api/controllers/oauth.controller';

const router = Router();

// Public — Meta/Google/TikTok/LinkedIn redirect here (sem JWT)
router.get('/:platform/callback', oauthController.callback);

// Autenticadas — requerem JWT
router.use(requireAuth);
router.get('/connections', oauthController.listConnections);
router.get('/:platform/connect', oauthController.connect);
router.delete('/:platform/disconnect', oauthController.disconnect);
router.post('/:platform/refresh', oauthController.refresh);

export default router;
