import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/', 'dist/', 'tests/', 'prisma/',
        // External API adapters — require integration tests, not unit tests
        'src/services/publishing/platforms/',
        'src/services/oauth/',
        // HTTP layer — covered by integration tests
        'src/api/controllers/',
        'src/api/routes/',
        'src/api/middleware/',
        // Infrastructure wrappers and scripts
        'src/lib/stripe.ts',
        'src/lib/resend.ts',
        'src/lib/supabase.ts',
        'src/lib/queue.ts',
        'scripts/',
        // Thin wrappers over external services (Evolution API, Supabase Storage)
        'src/services/whatsapp/whatsapp.service.ts',
        'src/services/whatsapp/media-handler.ts',
        // App entry points
        'src/index.ts',
        'src/api/app.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 60,  // private helpers counted but untestable directly
        branches: 70,
        statements: 80,
      },
    },
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
