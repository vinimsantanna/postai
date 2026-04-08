import 'dotenv/config';
import app from '@/api/app';
import prisma from '@/lib/prisma';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  // Verify DB connection on startup
  await prisma.$connect();
  console.log('[db] Connected to PostgreSQL');

  app.listen(PORT, () => {
    console.log(`[server] PostAI API running on port ${PORT} (${process.env.NODE_ENV})`);
  });
}

main().catch((err) => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});
