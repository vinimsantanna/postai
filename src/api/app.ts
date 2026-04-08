import express from 'express';
import healthRoutes from '@/api/routes/health.routes';
import authRoutes from '@/api/routes/auth.routes';
import webhookRoutes from '@/api/routes/webhook.routes';
import billingRoutes from '@/api/routes/billing.routes';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/billing', billingRoutes);
app.use('/webhook', webhookRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
