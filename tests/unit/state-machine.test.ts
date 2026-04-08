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

// Mock media persistence — returns the same URL (no Supabase in unit tests)
vi.mock('@/services/whatsapp/media-handler', () => ({
  persistMedia: vi.fn().mockImplementation((_url: string, _userId: string, _type: string, _id: string) =>
    Promise.resolve(_url),
  ),
}));

// Mock publisher — fire-and-forget (no real API calls in unit tests)
vi.mock('@/services/publishing/publisher.service', () => ({
  runPublish: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/scheduling/scheduler.service', () => ({
  schedulePost: vi.fn().mockResolvedValue(undefined),
  cancelScheduledPost: vi.fn().mockResolvedValue(true),
  listScheduledCampaigns: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/repositories/campaign.repository', () => ({
  campaignRepository: {
    create: vi.fn().mockResolvedValue({ id: 'camp-sched-1' }),
    setResults: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/notifications/whatsapp-notifier', () => ({
  retryFailedPlatforms: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
const { processMessage } = await import('@/services/whatsapp/state-machine/machine');
const { sessionRepository } = await import('@/repositories/session.repository');
const { whatsappService } = await import('@/services/whatsapp/whatsapp.service');
const { schedulePost, cancelScheduledPost, listScheduledCampaigns } = await import('@/services/scheduling/scheduler.service');
const { campaignRepository } = await import('@/repositories/campaign.repository');

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
        { isScheduled: true },
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

  describe('waiting_thumbnail state — scheduled flow', () => {
    it('transitions to waiting_schedule_date when isScheduled=true', async () => {
      const session = makeSession('waiting_thumbnail', {
        copy: 'Legenda', videoUrl: 'https://x.com/v.mp4', isScheduled: true,
      });
      await processMessage(session, makeMessage({ text: 'pular' }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith(
        'session-1', 'waiting_schedule_date', expect.objectContaining({ isScheduled: true }),
      );
    });
  });

  describe('waiting_schedule_date state', () => {
    it('accepts valid PT-BR date and transitions to confirm_schedule', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'));

      const session = makeSession('waiting_schedule_date', { copy: 'Legenda', videoUrl: 'https://x.com/v.mp4', isScheduled: true });
      await processMessage(session, makeMessage({ text: 'amanhã 18h' }));

      expect(sessionRepository.updateStep).toHaveBeenCalledWith(
        'session-1', 'confirm_schedule', expect.objectContaining({ scheduledAt: expect.any(String) }),
      );
      vi.useRealTimers();
    });

    it('rejects invalid date and stays in waiting_schedule_date', async () => {
      const session = makeSession('waiting_schedule_date', { copy: 'Legenda', videoUrl: 'https://x.com/v.mp4' });
      await processMessage(session, makeMessage({ text: 'banana' }));

      expect(sessionRepository.updateStep).not.toHaveBeenCalled();
      expect(whatsappService.sendText).toHaveBeenCalledWith('5573988548309', expect.stringContaining('inválida'));
    });
  });

  describe('confirm_schedule state', () => {
    const scheduledDraft = {
      copy: 'Legenda', videoUrl: 'https://x.com/v.mp4',
      scheduledAt: new Date('2026-04-11T21:00:00.000Z').toISOString(),
    };

    it('creates campaign and schedules job on "confirmar"', async () => {
      const session = makeSession('confirm_schedule', scheduledDraft);
      await processMessage(session, makeMessage({ text: 'confirmar' }));

      expect(campaignRepository.create).toHaveBeenCalledOnce();
      expect(schedulePost).toHaveBeenCalledWith(
        expect.objectContaining({ campaignId: 'camp-sched-1' }),
      );
      expect(sessionRepository.updateStep).toHaveBeenCalledWith(
        'session-1', 'menu', expect.objectContaining({ lastCampaignId: 'camp-sched-1' }),
      );
    });

    it('cancels scheduling on "cancelar"', async () => {
      const session = makeSession('confirm_schedule', scheduledDraft);
      await processMessage(session, makeMessage({ text: 'cancelar' }));

      expect(schedulePost).not.toHaveBeenCalled();
      expect(sessionRepository.updateStep).toHaveBeenCalledWith('session-1', 'menu', null);
    });
  });

  describe('menu state — cancelar command', () => {
    it('cancels scheduled post by index', async () => {
      vi.mocked(listScheduledCampaigns).mockResolvedValue([
        { index: 1, campaignId: 'camp-1', formattedDate: 'Sábado, 11/04 às 18:00', platforms: ['INSTAGRAM'] },
      ]);
      vi.mocked(cancelScheduledPost).mockResolvedValue(true);
      vi.mocked(campaignRepository.setResults).mockResolvedValue({} as never);

      const session = makeSession('menu');
      await processMessage(session, makeMessage({ text: 'cancelar 1' }));

      expect(cancelScheduledPost).toHaveBeenCalledWith('camp-1');
      expect(whatsappService.sendText).toHaveBeenCalledWith('5573988548309', expect.stringContaining('cancelado'));
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
