import { Router } from 'express';
import { version } from '../../../package.json';
import { getScheduledQueue } from '@/lib/queue';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', version, timestamp: new Date().toISOString() });
});

// Temporary: drain all delayed/waiting jobs from BullMQ queue
// Protected by ADMIN_SECRET env var
router.post('/drain-queue', async (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers['x-admin-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const queue = getScheduledQueue();
  const delayed = await queue.getDelayed();
  const waiting = await queue.getWaiting();
  for (const job of [...delayed, ...waiting]) {
    await job.remove();
  }
  res.json({ removed: delayed.length + waiting.length, delayed: delayed.length, waiting: waiting.length });
});

export default router;
