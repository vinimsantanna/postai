import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Platform } from '@prisma/client';

// Mock apiTokenRepository before importing parallel-publisher
vi.mock('@/repositories/api-token.repository', () => ({
  apiTokenRepository: {
    findByUser: vi.fn(),
  },
}));

// Mock individual platform publishers
vi.mock('@/services/publishing/platforms/instagram.publisher', () => ({
  publishToInstagram: vi.fn(),
}));
vi.mock('@/services/publishing/platforms/tiktok.publisher', () => ({
  publishToTikTok: vi.fn(),
}));
vi.mock('@/services/publishing/platforms/linkedin.publisher', () => ({
  publishToLinkedIn: vi.fn(),
}));
vi.mock('@/services/publishing/platforms/youtube.publisher', () => ({
  publishToYouTube: vi.fn(),
}));

import { publishToAllPlatforms } from '@/services/publishing/parallel-publisher';
import { apiTokenRepository } from '@/repositories/api-token.repository';
import { publishToInstagram } from '@/services/publishing/platforms/instagram.publisher';
import { publishToTikTok } from '@/services/publishing/platforms/tiktok.publisher';
import { publishToLinkedIn } from '@/services/publishing/platforms/linkedin.publisher';
import { publishToYouTube } from '@/services/publishing/platforms/youtube.publisher';

const MOCK_INPUT = {
  copy: 'Test post content',
  videoUrl: 'https://storage.supabase.co/videos/test.mp4',
  thumbnailUrl: undefined,
};

function mockToken(platform: Platform) {
  return { id: `token-${platform}`, platform, accessToken: `token_${platform}`, refreshToken: null };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('publishToAllPlatforms', () => {
  it('returns empty array when no platforms are connected', async () => {
    vi.mocked(apiTokenRepository.findByUser).mockResolvedValue([]);
    const results = await publishToAllPlatforms('user-1', MOCK_INPUT);
    expect(results).toHaveLength(0);
  });

  it('publishes to all 4 platforms in parallel and returns success results', async () => {
    vi.mocked(apiTokenRepository.findByUser).mockResolvedValue([
      mockToken('INSTAGRAM'),
      mockToken('TIKTOK'),
      mockToken('LINKEDIN'),
      mockToken('YOUTUBE'),
    ] as never);

    vi.mocked(publishToInstagram).mockResolvedValue({ postId: 'ig-1', postUrl: 'https://instagram.com/p/ig-1' });
    vi.mocked(publishToTikTok).mockResolvedValue({ publishId: 'tk-1', postUrl: 'https://tiktok.com/@user' });
    vi.mocked(publishToLinkedIn).mockResolvedValue({ postId: 'li-1', postUrl: 'https://linkedin.com/feed/update/li-1' });
    vi.mocked(publishToYouTube).mockResolvedValue({ videoId: 'yt-1', postUrl: 'https://youtube.com/watch?v=yt-1' });

    const results = await publishToAllPlatforms('user-1', MOCK_INPUT);

    expect(results).toHaveLength(4);
    expect(results.every((r) => r.success)).toBe(true);
    expect(results.find((r) => r.platform === 'INSTAGRAM')?.postUrl).toBe('https://instagram.com/p/ig-1');
    expect(results.find((r) => r.platform === 'YOUTUBE')?.postUrl).toBe('https://youtube.com/watch?v=yt-1');
  });

  it('graceful degradation: one failure does not block others', async () => {
    vi.mocked(apiTokenRepository.findByUser).mockResolvedValue([
      mockToken('INSTAGRAM'),
      mockToken('TIKTOK'),
    ] as never);

    vi.mocked(publishToInstagram).mockRejectedValue(new Error('Auth error 401'));
    vi.mocked(publishToTikTok).mockResolvedValue({ publishId: 'tk-1', postUrl: 'https://tiktok.com/@user' });

    const results = await publishToAllPlatforms('user-1', MOCK_INPUT);

    expect(results).toHaveLength(2);
    expect(results.find((r) => r.platform === 'INSTAGRAM')).toMatchObject({
      success: false,
      error: 'Auth error 401',
    });
    expect(results.find((r) => r.platform === 'TIKTOK')).toMatchObject({
      success: true,
      postUrl: 'https://tiktok.com/@user',
    });
  });

  it('retries transient errors (5xx) up to 3 times', async () => {
    vi.mocked(apiTokenRepository.findByUser).mockResolvedValue([
      mockToken('INSTAGRAM'),
    ] as never);

    vi.mocked(publishToInstagram)
      .mockRejectedValueOnce(new Error('500 internal server error'))
      .mockRejectedValueOnce(new Error('503 service unavailable'))
      .mockResolvedValue({ postId: 'ig-ok', postUrl: 'https://instagram.com/p/ig-ok' });

    const results = await publishToAllPlatforms('user-1', MOCK_INPUT);

    expect(publishToInstagram).toHaveBeenCalledTimes(3);
    expect(results[0].success).toBe(true);
  }, 15_000); // allow for retry delays

  it('does not retry 4xx (auth) errors', async () => {
    vi.mocked(apiTokenRepository.findByUser).mockResolvedValue([
      mockToken('LINKEDIN'),
    ] as never);

    vi.mocked(publishToLinkedIn).mockRejectedValue(new Error('401 unauthorized'));

    const results = await publishToAllPlatforms('user-1', MOCK_INPUT);

    expect(publishToLinkedIn).toHaveBeenCalledTimes(1); // no retry
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('401');
  });

  it('all platforms fail → all results have success: false', async () => {
    vi.mocked(apiTokenRepository.findByUser).mockResolvedValue([
      mockToken('INSTAGRAM'),
      mockToken('TIKTOK'),
    ] as never);

    vi.mocked(publishToInstagram).mockRejectedValue(new Error('Auth error'));
    vi.mocked(publishToTikTok).mockRejectedValue(new Error('Auth error'));

    const results = await publishToAllPlatforms('user-1', MOCK_INPUT);

    expect(results.every((r) => !r.success)).toBe(true);
  });
});
