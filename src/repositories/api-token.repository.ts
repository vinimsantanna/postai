import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import type { Platform } from '@prisma/client';

export interface UpsertTokenInput {
  userId: string;
  clientId?: string;
  platform: Platform;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export const apiTokenRepository = {
  async upsert(input: UpsertTokenInput) {
    const clientId = input.clientId ?? null;
    const tokenData = {
      accountName: input.accountName,
      accessToken: encrypt(input.accessToken),
      refreshToken: input.refreshToken ? encrypt(input.refreshToken) : null,
      expiresAt: input.expiresAt ?? null,
    };

    const existing = await prisma.apiToken.findFirst({
      where: { userId: input.userId, platform: input.platform, clientId },
    });

    if (existing) {
      return prisma.apiToken.update({
        where: { id: existing.id },
        data: { ...tokenData, deletedAt: null, updatedAt: new Date() },
      });
    }

    return prisma.apiToken.create({
      data: { userId: input.userId, clientId, platform: input.platform, ...tokenData },
    });
  },

  async findByUser(userId: string, clientId?: string) {
    const tokens = await prisma.apiToken.findMany({
      where: { userId, clientId: clientId ?? null, deletedAt: null },
    });
    return tokens.map(decryptToken);
  },

  async findByUserAndPlatform(userId: string, platform: Platform, clientId?: string) {
    const token = await prisma.apiToken.findFirst({
      where: { userId, platform, clientId: clientId ?? null, deletedAt: null },
    });
    return token ? decryptToken(token) : null;
  },

  async updateAccessToken(id: string, accessToken: string, expiresAt?: Date) {
    return prisma.apiToken.update({
      where: { id },
      data: {
        accessToken: encrypt(accessToken),
        expiresAt: expiresAt ?? null,
        updatedAt: new Date(),
      },
    });
  },

  async softDelete(userId: string, platform: Platform, clientId?: string) {
    return prisma.apiToken.updateMany({
      where: { userId, platform, clientId: clientId ?? null, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },
};

function decryptToken<T extends { accessToken: string; refreshToken: string | null }>(token: T): T {
  return {
    ...token,
    accessToken: decrypt(token.accessToken),
    refreshToken: token.refreshToken ? decrypt(token.refreshToken) : null,
  };
}
