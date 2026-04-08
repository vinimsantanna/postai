import { Router } from 'express';
import { agencyController } from '@/api/controllers/agency.controller';
import { requireAuth } from '@/api/middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/clients', agencyController.listClients);
router.post('/clients', agencyController.createClient);
router.delete('/clients/:clientId', agencyController.deleteClient);

export default router;
