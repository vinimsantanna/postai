import prisma from '@/lib/prisma';

export interface CreateClientInput {
  agencyUserId: string;
  name: string;
  segment?: string;
  notes?: string;
}

export const agencyClientRepository = {
  async create(input: CreateClientInput) {
    return prisma.agencyClient.create({
      data: {
        agencyUserId: input.agencyUserId,
        name: input.name,
        segment: input.segment ?? null,
        notes: input.notes ?? null,
      },
    });
  },

  async findByUser(agencyUserId: string) {
    return prisma.agencyClient.findMany({
      where: { agencyUserId, deletedAt: null },
      include: {
        tokens: {
          where: { deletedAt: null },
          select: { platform: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findById(id: string, agencyUserId: string) {
    return prisma.agencyClient.findFirst({
      where: { id, agencyUserId, deletedAt: null },
    });
  },

  async countActive(agencyUserId: string): Promise<number> {
    return prisma.agencyClient.count({
      where: { agencyUserId, deletedAt: null },
    });
  },

  async softDelete(id: string) {
    return prisma.agencyClient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
