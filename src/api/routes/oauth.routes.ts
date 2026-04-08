import { Router } from 'express';
import { requireAuth } from '@/api/middleware/auth.middleware';
import { oauthController } from '@/api/controllers/oauth.controller';

const router = Router();

// All OAuth routes require authentication (JWT)
router.use(requireAuth);

// GET  /oauth/connections          — list all platform connection statuses
router.get('/connections', oauthController.listConnections);

// GET  /oauth/:platform/connect    — get authorization URL
router.get('/:platform/connect', oauthController.connect);

// GET  /oauth/:platform/callback   — OAuth callback (code exchange)
router.get('/:platform/callback', oauthController.callback);

// DELETE /oauth/:platform/disconnect — revoke & remove token
router.delete('/:platform/disconnect', oauthController.disconnect);

// POST /oauth/:platform/refresh    — manually refresh access token
router.post('/:platform/refresh', oauthController.refresh);

export default router;
