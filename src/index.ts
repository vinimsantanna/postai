import 'dotenv/config';
import app from '@/api/app';
import prisma from '@/lib/prisma';
import { startSchedulerWorker } from '@/services/scheduling/job-processor';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DEPLOY_ID = Date.now().toString(36).toUpperCase(); // unique per container start

async function main(): Promise<void> {
  // Start HTTP server first — Railway healthcheck needs it up quickly
  const server = app.listen(PORT, () => {
    console.log(`[server] PostAI API running on port ${PORT} (${process.env.NODE_ENV}) deploy=${DEPLOY_ID}`);
  });

  // Connect to DB after server is up (non-fatal on startup)
  try {
    await prisma.$connect();
    console.log('[db] Connected to PostgreSQL');
  } catch (err) {
    console.error('[db] Could not connect to PostgreSQL:', err);
    console.warn('[db] Server running without DB — configure DATABASE_URL');
  }

  // Start BullMQ scheduler worker (non-fatal if Redis unavailable)
  try {
    startSchedulerWorker();
    console.log('[scheduler] BullMQ worker started');
  } catch (err) {
    console.warn('[scheduler] Could not start worker — configure REDIS_URL:', err);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[server] SIGTERM received, shutting down...');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});
