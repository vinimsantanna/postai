import prisma from '@/lib/prisma';
import type { CampaignDraft, ConversationState } from '@/domain/types';

export const sessionRepository = {
  async findActiveByPhone(phoneNumber: string) {
    return prisma.whatsappSession.findFirst({
      where: { phoneNumber, status: 'ACTIVE', deletedAt: null },
      include: { user: true },
    });
  },

  async findActiveByUserId(userId: string) {
    return prisma.whatsappSession.findFirst({
      where: { userId, status: 'ACTIVE', deletedAt: null },
    });
  },

  async upsertSession(userId: string, phoneNumber: string) {
    const existing = await this.findActiveByPhone(phoneNumber);
    if (existing) {
      return prisma.whatsappSession.update({
        where: { id: existing.id },
        data: { lastMessage: new Date() },
      });
    }
    return prisma.whatsappSession.create({
      data: { userId, phoneNumber },
    });
  },

  async updateStep(
    sessionId: string,
    step: ConversationState,
    draft?: CampaignDraft | null,
  ) {
    return prisma.whatsappSession.update({
      where: { id: sessionId },
      data: {
        currentStep: step,
        campaignDraft: draft !== undefined ? (draft as object) : undefined,
        lastMessage: new Date(),
      },
    });
  },

  async expireOldSessions() {
    const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 min
    return prisma.whatsappSession.updateMany({
      where: { status: 'ACTIVE', lastMessage: { lt: threshold } },
      data: { status: 'EXPIRED' },
    });
  },
};
