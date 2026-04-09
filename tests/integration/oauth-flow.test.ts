import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import app from '@/api/app';
import prisma from '@/lib/prisma';

// Mock billing — Stripe não está disponível no ambiente de testes
vi.mock('@/services/billing.service', () => ({
  billingService: {
    createCheckoutSession: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
  },
}));

const request = supertest(app);

const TEST_USER = {
  email: 'test-oauth@postai.com',
  password: 'password123',
  name: 'OAuth Test User',
  cpf: '98765432100',
  plan: 'CREATOR_STARTER',
};

let accessToken: string;
let userId: string;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function registerAndLogin() {
  await request.post('/auth/register').send(TEST_USER);
  const loginRes = await request.post('/auth/login').send({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  accessToken = loginRes.body.accessToken;
  userId = loginRes.body.user.id;
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.apiToken.deleteMany({ where: { user: { email: TEST_USER.email } } });
  await prisma.refreshToken.deleteMany({ where: { user: { email: TEST_USER.email } } });
  await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.apiToken.deleteMany({ where: { user: { email: TEST_USER.email } } });
  await prisma.refreshToken.deleteMany({ where: { user: { email: TEST_USER.email } } });
  await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
  await registerAndLogin();
});

// ─── Auth guard ──────────────────────────────────────────────────────────────

describe('OAuth routes — auth guard', () => {
  it('returns 401 without JWT', async () => {
    const res = await request.get('/oauth/connections');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid JWT', async () => {
    const res = await request.get('/oauth/connections').set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
  });
});

// ─── GET /oauth/connections ───────────────────────────────────────────────────

describe('GET /oauth/connections', () => {
  it('returns 4 platforms, all disconnected on fresh account', async () => {
    const res = await request
      .get('/oauth/connections')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.connections).toHaveLength(4);
    expect(res.body.connectedCount).toBe(0);

    for (const conn of res.body.connections) {
      expect(conn.connected).toBe(false);
      expect(conn.accountName).toBeNull();
    }
  });

  it('reflects connected platforms', async () => {
    // Seed a token directly in DB (simulate a connected account)
    const { encrypt } = await import('@/lib/crypto');
    await prisma.apiToken.create({
      data: {
        userId,
        platform: 'INSTAGRAM',
        accountName: '@testuser',
        accessToken: encrypt('fake_access_token'),
      },
    });

    const res = await request
      .get('/oauth/connections')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.connectedCount).toBe(1);
    const ig = res.body.connections.find((c: { platform: string }) => c.platform === 'INSTAGRAM');
    expect(ig.connected).toBe(true);
    expect(ig.accountName).toBe('@testuser');
  });
});

// ─── GET /oauth/:platform/connect ────────────────────────────────────────────

describe('GET /oauth/:platform/connect', () => {
  const platforms = ['instagram', 'tiktok', 'linkedin', 'youtube'];

  it.each(platforms)('returns 200 with auth URL for %s when env is configured', async (platform) => {
    // Set minimal env vars for all platforms so getAuthUrl doesn't throw
    process.env.INSTAGRAM_APP_ID = 'test_ig_id';
    process.env.INSTAGRAM_APP_SECRET = 'test_ig_secret';
    process.env.INSTAGRAM_REDIRECT_URI = 'https://postai.app/oauth/instagram/callback';
    process.env.TIKTOK_CLIENT_KEY = 'test_tk_key';
    process.env.TIKTOK_CLIENT_SECRET = 'test_tk_secret';
    process.env.TIKTOK_REDIRECT_URI = 'https://postai.app/oauth/tiktok/callback';
    process.env.LINKEDIN_CLIENT_ID = 'test_li_id';
    process.env.LINKEDIN_CLIENT_SECRET = 'test_li_secret';
    process.env.LINKEDIN_REDIRECT_URI = 'https://postai.app/oauth/linkedin/callback';
    process.env.YOUTUBE_CLIENT_ID = 'test_yt_id';
    process.env.YOUTUBE_CLIENT_SECRET = 'test_yt_secret';
    process.env.YOUTUBE_REDIRECT_URI = 'https://postai.app/oauth/youtube/callback';

    const res = await request
      .get(`/oauth/${platform}/connect`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(typeof res.body.url).toBe('string');
    expect(res.body.url.length).toBeGreaterThan(10);
  });

  it('returns 400 for unsupported platform', async () => {
    const res = await request
      .get('/oauth/twitter/connect')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported/i);
  });
});

// ─── GET /oauth/:platform/callback (mocked) ──────────────────────────────────

describe('GET /oauth/:platform/callback — mocked token exchange', () => {
  it('returns 400 when code is missing', async () => {
    process.env.INSTAGRAM_APP_ID = 'test_ig_id';
    process.env.INSTAGRAM_APP_SECRET = 'test_ig_secret';
    process.env.INSTAGRAM_REDIRECT_URI = 'https://postai.app/oauth/instagram/callback';

    const res = await request
      .get('/oauth/instagram/callback?state=somestate')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns 400 when state is missing', async () => {
    const res = await request
      .get('/oauth/instagram/callback?code=someCode')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 on OAuth error param', async () => {
    const res = await request
      .get('/oauth/instagram/callback?error=access_denied&state=somestate')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/denied/i);
  });

  it('calls Instagram token exchange and saves token (mocked fetch)', async () => {
    process.env.INSTAGRAM_APP_ID = 'test_ig_id';
    process.env.INSTAGRAM_APP_SECRET = 'test_ig_secret';
    process.env.INSTAGRAM_REDIRECT_URI = 'https://postai.app/oauth/instagram/callback';

    // Build a valid state for this user
    const { instagramOAuth } = await import('@/services/oauth/instagram.oauth');
    const authUrl = instagramOAuth.getAuthUrl(userId);
    const state = new URL(authUrl).searchParams.get('state')!;

    // Mock global fetch
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('oauth/access_token')) {
        return new Response(JSON.stringify({ access_token: 'short_token', user_id: '123456' }), { status: 200 });
      }
      if (urlStr.includes('graph.instagram.com/access_token')) {
        return new Response(
          JSON.stringify({ access_token: 'long_token_abc', expires_in: 5183944 }),
          { status: 200 }
        );
      }
      if (urlStr.includes('graph.instagram.com/me')) {
        return new Response(JSON.stringify({ username: 'mocked_user' }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });

    const res = await request
      .get(`/oauth/instagram/callback?code=test_code&state=${state}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .redirects(0);

    fetchSpy.mockRestore();

    // Callback redirects to frontend after saving token
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('connected=INSTAGRAM');

    // Verify token was saved in DB
    const saved = await prisma.apiToken.findFirst({
      where: { userId, platform: 'INSTAGRAM' },
    });
    expect(saved).not.toBeNull();
    expect(saved?.accountName).toBe('@mocked_user');
  });
});

// ─── DELETE /oauth/:platform/disconnect ──────────────────────────────────────

describe('DELETE /oauth/:platform/disconnect', () => {
  it('soft-deletes the token', async () => {
    const { encrypt } = await import('@/lib/crypto');
    await prisma.apiToken.create({
      data: {
        userId,
        platform: 'LINKEDIN',
        accountName: 'Test User',
        accessToken: encrypt('fake_li_token'),
      },
    });

    // Mock LinkedIn revoke (best effort)
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    process.env.LINKEDIN_CLIENT_ID = 'test_li_id';
    process.env.LINKEDIN_CLIENT_SECRET = 'test_li_secret';
    process.env.LINKEDIN_REDIRECT_URI = 'https://postai.app/oauth/linkedin/callback';

    const res = await request
      .delete('/oauth/linkedin/disconnect')
      .set('Authorization', `Bearer ${accessToken}`);

    fetchSpy.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await prisma.apiToken.findFirst({
      where: { userId, platform: 'LINKEDIN', deletedAt: null },
    });
    expect(deleted).toBeNull();
  });
});
