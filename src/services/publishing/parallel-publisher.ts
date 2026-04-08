import type { Platform } from '@prisma/client';
import { apiTokenRepository } from '@/repositories/api-token.repository';
import { publishToInstagram } from './platforms/instagram.publisher';
import { publishToTikTok } from './platforms/tiktok.publisher';
import { publishToLinkedIn } from './platforms/linkedin.publisher';
import { publishToYouTube } from './platforms/youtube.publisher';

export interface PublishInput {
  copy: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

export interface PlatformResult {
  platform: Platform;
  success: boolean;
  postUrl?: string;
  error?: string;
}

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000]; // 3 attempts, exponential backoff

/**
 * Publishes to all connected platforms in parallel.
 * Uses Promise.allSettled — one failure never blocks others.
 */
export async function publishToAllPlatforms(
  userId: string,
  input: PublishInput,
  clientId?: string,
): Promise<PlatformResult[]> {
  const tokens = await apiTokenRepository.findByUser(userId, clientId);

  if (tokens.length === 0) return [];

  const tasks = tokens.map((token) =>
    withRetry(() => callPlatform(token.platform, token.accessToken, input))
      .then((postUrl) => ({ platform: token.platform, success: true, postUrl }))
      .catch((err: Error) => ({
        platform: token.platform,
        success: false,
        error: err.message,
      })),
  );

  return Promise.all(tasks); // each task already handles its own errors
}

async function callPlatform(
  platform: Platform,
  accessToken: string,
  input: PublishInput,
): Promise<string> {
  const { copy, videoUrl, thumbnailUrl } = input;

  switch (platform) {
    case 'INSTAGRAM': {
      const r = await publishToInstagram(accessToken, copy, videoUrl, thumbnailUrl);
      return r.postUrl;
    }
    case 'TIKTOK': {
      const r = await publishToTikTok(accessToken, copy, videoUrl, thumbnailUrl);
      return r.postUrl;
    }
    case 'LINKEDIN': {
      const r = await publishToLinkedIn(accessToken, copy, videoUrl, thumbnailUrl);
      return r.postUrl;
    }
    case 'YOUTUBE': {
      const r = await publishToYouTube(accessToken, copy, videoUrl, thumbnailUrl);
      return r.postUrl;
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Do not retry on 4xx (auth/permission errors) — only on transient failures
      if (!isTransient(lastError)) throw lastError;

      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  throw lastError;
}

function isTransient(err: Error): boolean {
  const msg = err.message.toLowerCase();
  // Retry on 5xx, timeouts, network errors
  return (
    msg.includes('5') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('network')
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
