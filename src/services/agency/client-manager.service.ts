import { agencyClientRepository, type CreateClientInput } from '@/repositories/agency-client.repository';
import { userRepository } from '@/repositories/user.repository';
import { canAddClient } from '@/domain/plans';
import prisma from '@/lib/prisma';

export const clientManagerService = {
  async createClient(agencyUserId: string, input: Omit<CreateClientInput, 'agencyUserId'>) {
    const user = await userRepository.findById(agencyUserId);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    const currentCount = await agencyClientRepository.countActive(agencyUserId);
    if (!canAddClient(user.plan, currentCount)) {
      throw Object.assign(
        new Error('Client limit reached for your plan. Upgrade to add more clients.'),
        { status: 403 },
      );
    }

    return agencyClientRepository.create({ agencyUserId, ...input });
  },

  async listClients(agencyUserId: string) {
    return agencyClientRepository.findByUser(agencyUserId);
  },

  async deleteClient(agencyUserId: string, clientId: string) {
    const client = await agencyClientRepository.findById(clientId, agencyUserId);
    if (!client) throw Object.assign(new Error('Client not found'), { status: 404 });

    // Revoke all OAuth tokens for this client
    await prisma.apiToken.updateMany({
      where: { clientId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    // Soft-delete the client (campaigns are preserved — historical data)
    await agencyClientRepository.softDelete(clientId);
  },
};
