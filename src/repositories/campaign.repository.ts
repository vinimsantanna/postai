import prisma from '@/lib/prisma';
import type { Platform, CampaignStatus } from '@prisma/client';

export interface CreateCampaignInput {
  userId: string;
  clientId?: string;
  copy: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  platforms: Platform[];
  scheduledAt?: Date;
}

export interface PublishResult {
  success: boolean;
  postUrl?: string;
  error?: string;
}

export const campaignRepository = {
  async create(input: CreateCampaignInput) {
    return prisma.campaign.create({
      data: {
        userId: input.userId,
        clientId: input.clientId ?? null,
        originalCopy: input.copy,
        videoUrl: input.videoUrl ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        platforms: input.platforms,
        status: 'DRAFT',
        scheduledAt: input.scheduledAt ?? null,
      },
    });
  },

  async setPublishing(id: string) {
    return prisma.campaign.update({
      where: { id },
      data: { status: 'PUBLISHING' },
    });
  },

  async setResults(
    id: string,
    results: Record<string, PublishResult>,
    status: CampaignStatus,
  ) {
    const isTerminal = status === 'PUBLISHED' || status === 'PARTIAL_FAILURE' || status === 'FAILED';
    return prisma.campaign.update({
      where: { id },
      data: {
        status,
        results: results as object,
        ...(isTerminal && { publishedAt: new Date() }),
      },
    });
  },

  async findByUser(userId: string, limit = 20) {
    return prisma.campaign.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findRecentPublished(userId: string, limit = 5) {
    return prisma.campaign.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['PUBLISHED', 'PARTIAL_FAILURE', 'FAILED'] },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  },
};
