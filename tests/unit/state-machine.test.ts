import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WhatsappSession, User } from '@prisma/client';
import type { ParsedMessage } from '@/domain/types';

// Mock dependencies
vi.mock('@/repositories/session.repository', () => ({
  sessionRepository: {
    updateStep: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/whatsapp/whatsapp.service', () => ({
  whatsappService: {
    sendText: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks
const { processMessage } = await import('@/services/whatsapp/state-machine/machine');
const { sessionRepository } = await import('@/repositories/session.repository');
const { whatsappService } = await import('@/services/whatsapp/whatsapp.service');

function makeSession(step = 'menu', draft = {}): WhatsappSession & { user: User } {
  return {
    id: 'session-1',
    userId: 'user-1',
    phoneNumber: '5573988548309',
    currentStep: step,
    campaignDraft: draft,
    activeClientId: null,
    status: 'ACTIVE',
    deletedAt: null,
    sessionStarted: new Date(),
    lastMessage: new Date(),
    user: {
      id: 'user-1',
      email: 'test@test.com',
      cpf: 'encrypted',
      cpfMasked: '739.885.483-09',
      name: 'Diego',
      passwordHash: 'hash',
      plan: 'CREATOR',
      status: 'ACTIVE',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

function makeMessage(overrides: Partial<ParsedMessage> = {}): ParsedMessage {
  return {
    type: 'text',
    from: '5573988548309',
    messageId: 'msg-1',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('State Machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('menu state', () => {
    it('transitions to waiting_copy when user sends "1"', async () => {
      const session = makeSession('menu');
      await processMessage(session, makeMessage({ text: '1' }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith(
        'session-1',
        'waiting_copy',
        {},
      );
      expect(whatsappService.sendText).toHaveBeenCalled();
    });

    it('transitions to waiting_schedule when user sends "2"', async () => {
      const session = makeSession('menu');
      await processMessage(session, makeMessage({ text: '2' }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith(
        'session-1',
        'waiting_schedule',
        {},
      );
    });

    it('shows menu again for unknown input', async () => {
      const session = makeSession('menu');
      await processMessage(session, makeMessage({ text: 'random' }));

      expect(sessionRepository.updateStep).not.toHaveBeenCalled();
      expect(whatsappService.sendText).toHaveBeenCalled();
    });
  });

  describe('waiting_copy state', () => {
    it('saves copy and transitions to waiting_video', async () => {
      const session = makeSession('waiting_copy');
      await processMessage(session, makeMessage({ text: 'Minha legenda incrível #hashtag' }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith(
        'session-1',
        'waiting_video',
        { copy: 'Minha legenda incrível #hashtag' },
      );
    });

    it('rejects short copy', async () => {
      const session = makeSession('waiting_copy');
      await processMessage(session, makeMessage({ text: 'ok' }));

      expect(sessionRepository.updateStep).not.toHaveBeenCalled();
      expect(whatsappService.sendText).toHaveBeenCalledWith(
        '5573988548309',
        expect.stringContaining('caracteres'),
      );
    });
  });

  describe('waiting_video state', () => {
    it('saves video URL and transitions to waiting_thumbnail', async () => {
      const session = makeSession('waiting_video', { copy: 'Minha legenda' });
      await processMessage(session, makeMessage({
        type: 'video',
        mediaUrl: 'https://example.com/video.mp4',
      }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith(
        'session-1',
        'waiting_thumbnail',
        { copy: 'Minha legenda', videoUrl: 'https://example.com/video.mp4' },
      );
    });

    it('rejects non-video messages', async () => {
      const session = makeSession('waiting_video');
      await processMessage(session, makeMessage({ type: 'text', text: 'não é vídeo' }));

      expect(sessionRepository.updateStep).not.toHaveBeenCalled();
    });
  });

  describe('waiting_thumbnail state', () => {
    it('saves thumbnail and transitions to confirm_publish', async () => {
      const session = makeSession('waiting_thumbnail', {
        copy: 'Legenda',
        videoUrl: 'https://example.com/video.mp4',
      });
      await processMessage(session, makeMessage({
        type: 'image',
        mediaUrl: 'https://example.com/thumb.jpg',
      }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith(
        'session-1',
        'confirm_publish',
        expect.objectContaining({ thumbnailUrl: 'https://example.com/thumb.jpg' }),
      );
    });

    it('skips thumbnail when user sends text', async () => {
      const session = makeSession('waiting_thumbnail', { copy: 'Legenda', videoUrl: 'https://x.com/v.mp4' });
      await processMessage(session, makeMessage({ type: 'text', text: 'pular' }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith(
        'session-1',
        'confirm_publish',
        expect.not.objectContaining({ thumbnailUrl: expect.anything() }),
      );
    });
  });

  describe('confirm_publish state', () => {
    const draft = { copy: 'Legenda', videoUrl: 'https://x.com/v.mp4' };

    it('confirms and transitions to menu on "confirmar"', async () => {
      const session = makeSession('confirm_publish', draft);
      await processMessage(session, makeMessage({ text: 'confirmar' }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith('session-1', 'menu', null);
    });

    it('cancels and transitions to menu on "cancelar"', async () => {
      const session = makeSession('confirm_publish', draft);
      await processMessage(session, makeMessage({ text: 'cancelar' }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith('session-1', 'menu', null);
    });

    it('resends confirm message for unknown input', async () => {
      const session = makeSession('confirm_publish', draft);
      await processMessage(session, makeMessage({ text: 'talvez' }));

      expect(sessionRepository.updateStep).not.toHaveBeenCalled();
      expect(whatsappService.sendText).toHaveBeenCalledWith(
        '5573988548309',
        expect.stringContaining('Confirme'),
      );
    });
  });
});
