import prisma from '@/lib/prisma';
import { encrypt, normalizeCpf, maskCpf } from '@/lib/crypto';
import type { Plan } from '@/domain/types';

export interface CreateUserInput {
  email: string;
  cpf: string;
  name: string;
  passwordHash: string;
}

export const userRepository = {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  },

  async findByCpf(cpf: string) {
    const normalized = normalizeCpf(cpf);
    const encrypted = encrypt(normalized);
    return prisma.user.findFirst({
      where: { cpf: encrypted, deletedAt: null },
    });
  },

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async create(input: CreateUserInput) {
    const normalized = normalizeCpf(input.cpf);
    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        cpf: encrypt(normalized),
        cpfMasked: maskCpf(normalized),
        name: input.name,
        passwordHash: input.passwordHash,
      },
    });
  },

  async updatePlan(userId: string, plan: Plan) {
    return prisma.user.update({
      where: { id: userId },
      data: { plan, status: 'ACTIVE' },
    });
  },

  async softDelete(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), email: `deleted_${Date.now()}_${userId}` },
    });
  },
};
