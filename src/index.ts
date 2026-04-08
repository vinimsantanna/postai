import 'dotenv/config';
import app from '@/api/app';
import prisma from '@/lib/prisma';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  // Start HTTP server first — Railway healthcheck needs it up quickly
  const server = app.listen(PORT, () => {
    console.log(`[server] PostAI API running on port ${PORT} (${process.env.NODE_ENV})`);
  });

  // Connect to DB after server is up (non-fatal on startup)
  try {
    await prisma.$connect();
    console.log('[db] Connected to PostgreSQL');
  } catch (err) {
    console.error('[db] Could not connect to PostgreSQL:', err);
    console.warn('[db] Server running without DB — configure DATABASE_URL');
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
