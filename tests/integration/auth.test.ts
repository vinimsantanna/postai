import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import app from '@/api/app';
import prisma from '@/lib/prisma';

const request = supertest(app);

const TEST_USER = {
  email: 'test-auth@postai.com',
  password: 'password123',
  name: 'Test User',
  cpf: '52998224725',
  plan: 'CREATOR_STARTER',
};

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany({ where: { user: { email: TEST_USER.email } } });
  await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.refreshToken.deleteMany({ where: { user: { email: TEST_USER.email } } });
  await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
});

describe('POST /auth/register', () => {
  it('registers a new user', async () => {
    const res = await request.post('/auth/register').send(TEST_USER);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  it('returns 409 for duplicate email', async () => {
    await request.post('/auth/register').send(TEST_USER);
    const res = await request.post('/auth/register').send(TEST_USER);
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request.post('/auth/register').send({ ...TEST_USER, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await request.post('/auth/register').send({ ...TEST_USER, password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request.post('/auth/register').send(TEST_USER);
  });

  it('logs in with correct credentials', async () => {
    const res = await request.post('/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request.post('/auth/login').send({
      email: TEST_USER.email,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request.post('/auth/login').send({
      email: 'nobody@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('issues new tokens with valid refresh token', async () => {
    const { body: registered } = await request.post('/auth/register').send(TEST_USER);
    const res = await request.post('/auth/refresh').send({
      refreshToken: registered.refreshToken,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.refreshToken).not.toBe(registered.refreshToken); // rotated
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await request.post('/auth/refresh').send({ refreshToken: 'invalid' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when reusing rotated refresh token', async () => {
    const { body: registered } = await request.post('/auth/register').send(TEST_USER);
    await request.post('/auth/refresh').send({ refreshToken: registered.refreshToken });
    const res = await request.post('/auth/refresh').send({ refreshToken: registered.refreshToken });
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes refresh token and returns 204', async () => {
    const { body: registered } = await request.post('/auth/register').send(TEST_USER);
    const res = await request.post('/auth/logout').send({ refreshToken: registered.refreshToken });
    expect(res.status).toBe(204);

    // Refresh should fail after logout
    const refresh = await request.post('/auth/refresh').send({ refreshToken: registered.refreshToken });
    expect(refresh.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
