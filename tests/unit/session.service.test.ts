import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/repositories/session.repository');
vi.mock('@/services/whatsapp/whatsapp.service', () => ({
  whatsappService: { sendText: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/services/whatsapp/state-machine/machine', () => ({
  processMessage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock('@/lib/crypto', () => ({
  decrypt: vi.fn((v: string) => v),         // identity for test
  normalizeCpf: vi.fn((v: string) => v.replace(/\D/g, '')),
  encrypt: vi.fn((v: string) => v),
  maskCpf: vi.fn(() => '111.444.777-35'),
}));

import { sessionService } from '@/services/whatsapp/session.service';
import { sessionRepository } from '@/repositories/session.repository';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';
import { processMessage } from '@/services/whatsapp/state-machine/machine';
import prisma from '@/lib/prisma';

const makeMsg = (text?: string) => ({
  type: 'text' as const,
  from: '+5511999',
  text,
  messageId: 'msg-1',
  timestamp: Date.now(),
});

const activeUser = {
  id: 'user-1', name: 'Diego', status: 'ACTIVE',
  cpf: '11144477735', // decrypt is identity mock, so this is the "plain" CPF
};

const activeSession = {
  id: 'sess-1', userId: 'user-1', currentStep: 'menu',
  campaignDraft: null, activeClientId: null,
  user: activeUser,
};

beforeEach(() => vi.clearAllMocks());

describe('sessionService.handleIncoming', () => {
  it('routes to state machine when active session exists', async () => {
    vi.mocked(sessionRepository.findActiveByPhone).mockResolvedValue(activeSession as never);

    await sessionService.handleIncoming(makeMsg('1'));

    expect(processMessage).toHaveBeenCalledWith(activeSession, expect.objectContaining({ text: '1' }));
  });

  it('asks for CPF when no session and no text', async () => {
    vi.mocked(sessionRepository.findActiveByPhone).mockResolvedValue(null);

    await sessionService.handleIncoming(makeMsg(undefined));

    expect(whatsappService.sendText).toHaveBeenCalledWith('+5511999', expect.stringContaining('CPF'));
  });

  it('asks for CPF when input is not 11 digits', async () => {
    vi.mocked(sessionRepository.findActiveByPhone).mockResolvedValue(null);

    await sessionService.handleIncoming(makeMsg('123'));

    expect(whatsappService.sendText).toHaveBeenCalledWith('+5511999', expect.stringContaining('CPF'));
  });

  it('creates session and greets user when CPF matches active user', async () => {
    vi.mocked(sessionRepository.findActiveByPhone).mockResolvedValue(null);
    vi.mocked(prisma.user.findMany).mockResolvedValue([activeUser] as never);
    vi.mocked(sessionRepository.upsertSession).mockResolvedValue({} as never);

    await sessionService.handleIncoming(makeMsg('11144477735'));

    expect(sessionRepository.upsertSession).toHaveBeenCalledWith('user-1', '+5511999');
    const calls = vi.mocked(whatsappService.sendText).mock.calls.map((c) => c[1]);
    expect(calls.some((m) => m.includes('Diego'))).toBe(true);
  });

  it('sends CPF_NOT_FOUND when CPF has no matching user', async () => {
    vi.mocked(sessionRepository.findActiveByPhone).mockResolvedValue(null);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await sessionService.handleIncoming(makeMsg('11144477735'));

    expect(whatsappService.sendText).toHaveBeenCalledWith(
      '+5511999',
      expect.stringContaining('não encontrado'),
    );
  });

  it('sends CPF_INACTIVE when user status is not ACTIVE', async () => {
    vi.mocked(sessionRepository.findActiveByPhone).mockResolvedValue(null);
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ ...activeUser, status: 'PENDING_PAYMENT' }] as never);

    await sessionService.handleIncoming(makeMsg('11144477735'));

    expect(whatsappService.sendText).toHaveBeenCalledWith(
      '+5511999',
      expect.stringContaining('inativa'),
    );
  });
});
