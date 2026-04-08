import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('@/repositories/user.repository');
vi.mock('@/services/billing.service');
vi.mock('@/lib/prisma', () => ({
  default: {
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-pw'),
    compare: vi.fn(),
  },
}));

import { authService } from '@/services/auth.service';
import { userRepository } from '@/repositories/user.repository';
import { billingService } from '@/services/billing.service';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-1',
  email: 'diego@example.com',
  name: 'Diego',
  plan: 'CREATOR_STARTER' as const,
  status: 'ACTIVE' as const,
  passwordHash: 'hashed-pw',
  cpf: 'encrypted-cpf',
  cpfMasked: '111.444.777-35',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-32chars-minimum-here';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-here';
});

beforeEach(() => vi.clearAllMocks());

describe('authService.register', () => {
  it('creates user and returns checkoutUrl', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue(null);
    vi.mocked(userRepository.create).mockResolvedValue(mockUser);
    vi.mocked(billingService.createCheckoutSession).mockResolvedValue({ url: 'https://stripe.com/pay/xxx' });

    const result = await authService.register({
      email: 'diego@example.com',
      password: 'pass1234',
      name: 'Diego',
      cpf: '11144477735',
      plan: 'CREATOR_STARTER',
    });

    expect(result.checkoutUrl).toBe('https://stripe.com/pay/xxx');
    expect(result.userId).toBe('user-1');
    expect(billingService.createCheckoutSession).toHaveBeenCalledWith(
      'user-1',
      'CREATOR_STARTER',
      expect.stringContaining('/billing/success'),
      expect.stringContaining('/billing/cancelled'),
    );
  });

  it('rejects duplicate email (409)', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);

    await expect(
      authService.register({ email: 'diego@example.com', password: 'pass1234', name: 'Diego', cpf: '11144477735', plan: 'CREATOR_STARTER' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects duplicate CPF (409)', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.findByCpf).mockResolvedValue(mockUser);

    await expect(
      authService.register({ email: 'new@example.com', password: 'pass1234', name: 'Diego', cpf: '11144477735', plan: 'CREATOR_STARTER' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('authService.login', () => {
  it('returns tokens for valid credentials', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);

    const result = await authService.login({ email: 'diego@example.com', password: 'pass1234' });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('diego@example.com');
  });

  it('rejects unknown email (401)', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

    await expect(
      authService.login({ email: 'ghost@example.com', password: 'pass1234' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects wrong password (401)', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      authService.login({ email: 'diego@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects cancelled account (403)', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ ...mockUser, status: 'CANCELLED' });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      authService.login({ email: 'diego@example.com', password: 'pass1234' }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('authService.refresh', () => {
  it('rotates refresh token and returns new tokens', async () => {
    vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue({
      id: 'rt-1', token: 'old-token', userId: 'user-1', user: mockUser,
      expiresAt: new Date(Date.now() + 1000), revokedAt: null, createdAt: new Date(),
    } as never);
    vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);

    const result = await authService.refresh('old-token');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rt-1' } }),
    );
  });

  it('rejects expired/invalid token (401)', async () => {
    vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue(null);

    await expect(authService.refresh('bad-token')).rejects.toMatchObject({ status: 401 });
  });
});

describe('authService.logout', () => {
  it('revokes refresh token', async () => {
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 });

    await authService.logout('some-token');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ token: 'some-token' }) }),
    );
  });
});

describe('authService.verifyRefreshToken', () => {
  it('returns userId for valid signed token', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign(
      { sub: 'user-42', email: 'a@b.com', plan: 'CREATOR_STARTER' },
      'test-refresh-secret-32chars-here',
    );
    const userId = await authService.verifyRefreshToken(token);
    expect(userId).toBe('user-42');
  });

  it('throws 401 on invalid token', async () => {
    await expect(authService.verifyRefreshToken('bad-token')).rejects.toMatchObject({ status: 401 });
  });
});

describe('authService.verifyAccessToken', () => {
  it('returns payload for valid token', async () => {
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
    // Sign a token to verify
    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign({ sub: 'u1', email: 'a@b.com', plan: 'CREATOR_STARTER' }, 'test-secret-32chars-minimum-here');
    const payload = authService.verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
  });

  it('throws on invalid token', () => {
    expect(() => authService.verifyAccessToken('bad.token.here')).toThrow();
  });
});
