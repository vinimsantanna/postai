import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { userRepository } from '@/repositories/user.repository';
import { billingService } from '@/services/billing.service';
import type { JwtPayload } from '@/domain/types';
import type { Plan } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 48;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');
  return secret;
}

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as jwt.SignOptions);
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d
  await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  return token;
}

export const authService = {
  async register(input: { email: string; password: string; name: string; cpf: string; plan: Plan }) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 });

    const cpfUser = await userRepository.findByCpf(input.cpf);
    if (cpfUser) throw Object.assign(new Error('CPF already registered'), { status: 409 });

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await userRepository.create({
      email: input.email,
      cpf: input.cpf,
      name: input.name,
      passwordHash,
    });

    const appUrl = process.env.APP_URL ?? 'https://postai-production-a966.up.railway.app';
    const { url: checkoutUrl } = await billingService.createCheckoutSession(
      user.id,
      input.plan,
      `${appUrl}/billing/success`,
      `${appUrl}/billing/cancelled`,
    );

    return { checkoutUrl, userId: user.id };
  },

  async login(input: { email: string; password: string }) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    if (user.status === 'CANCELLED') {
      throw Object.assign(new Error('Account cancelled'), { status: 403 });
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, plan: user.plan };
    const accessToken = signAccessToken(payload);
    const refreshToken = await createRefreshToken(user.id);

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } };
  },

  async refresh(token: string) {
    const record = await prisma.refreshToken.findFirst({
      where: { token, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record) throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

    const payload: JwtPayload = { sub: record.user.id, email: record.user.email, plan: record.user.plan };
    const accessToken = signAccessToken(payload);
    const newRefreshToken = await createRefreshToken(record.user.id);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(token: string) {
    await prisma.refreshToken.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  },

  async verifyRefreshToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, getRefreshSecret()) as JwtPayload;
      return decoded.sub;
    } catch {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }
  },
};
