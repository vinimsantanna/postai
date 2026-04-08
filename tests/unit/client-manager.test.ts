import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/repositories/agency-client.repository');
vi.mock('@/repositories/user.repository');
vi.mock('@/lib/prisma', () => ({ default: { apiToken: { updateMany: vi.fn() } } }));

import { clientManagerService } from '@/services/agency/client-manager.service';
import { agencyClientRepository } from '@/repositories/agency-client.repository';
import { userRepository } from '@/repositories/user.repository';

const mockUser = (plan: string) => ({
  id: 'user-1',
  plan,
  name: 'Marina',
  email: 'marina@agency.com',
  status: 'ACTIVE',
});

beforeEach(() => vi.clearAllMocks());

describe('clientManagerService.createClient', () => {
  it('creates client when under plan limit', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(mockUser('AGENCY_SYMPHONY') as never);
    vi.mocked(agencyClientRepository.countActive).mockResolvedValue(5);
    vi.mocked(agencyClientRepository.create).mockResolvedValue({
      id: 'client-1', agencyUserId: 'user-1', name: 'Acme', segment: null, notes: null,
      deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
    });

    const result = await clientManagerService.createClient('user-1', { name: 'Acme' });
    expect(result.name).toBe('Acme');
    expect(agencyClientRepository.create).toHaveBeenCalledOnce();
  });

  it('rejects when plan limit is reached (AGENCY_SYMPHONY = 10)', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(mockUser('AGENCY_SYMPHONY') as never);
    vi.mocked(agencyClientRepository.countActive).mockResolvedValue(10);

    await expect(
      clientManagerService.createClient('user-1', { name: 'Client 11' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('rejects for non-agency plan (maxClients = 0)', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(mockUser('CREATOR_PRO') as never);
    vi.mocked(agencyClientRepository.countActive).mockResolvedValue(0);

    await expect(
      clientManagerService.createClient('user-1', { name: 'Client' }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('clientManagerService.deleteClient', () => {
  it('revokes tokens and soft-deletes client', async () => {
    const prisma = (await import('@/lib/prisma')).default;
    vi.mocked(agencyClientRepository.findById).mockResolvedValue({
      id: 'client-1', agencyUserId: 'user-1', name: 'Acme', segment: null, notes: null,
      deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(agencyClientRepository.softDelete).mockResolvedValue({} as never);
    vi.mocked(prisma.apiToken.updateMany).mockResolvedValue({ count: 2 });

    await clientManagerService.deleteClient('user-1', 'client-1');

    expect(prisma.apiToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientId: 'client-1' }) }),
    );
    expect(agencyClientRepository.softDelete).toHaveBeenCalledWith('client-1');
  });

  it('throws 404 for unknown client', async () => {
    vi.mocked(agencyClientRepository.findById).mockResolvedValue(null);

    await expect(
      clientManagerService.deleteClient('user-1', 'unknown'),
    ).rejects.toMatchObject({ status: 404 });
  });
});
