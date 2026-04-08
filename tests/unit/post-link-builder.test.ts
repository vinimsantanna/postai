import { describe, it, expect } from 'vitest';
import {
  buildPostUrl,
  formatPlatformLine,
  buildNotificationMessage,
} from '@/services/notifications/post-link-builder';

describe('buildPostUrl', () => {
  it('builds correct Instagram URL', () => {
    expect(buildPostUrl('INSTAGRAM', 'ABC123')).toBe('https://www.instagram.com/p/ABC123/');
  });

  it('builds correct YouTube URL (youtu.be short link)', () => {
    expect(buildPostUrl('YOUTUBE', 'dQw4w9WgXcQ')).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  it('builds correct LinkedIn URL', () => {
    expect(buildPostUrl('LINKEDIN', 'urn:li:ugcPost:123')).toBe(
      'https://www.linkedin.com/feed/update/urn:li:ugcPost:123',
    );
  });

  it('returns TikTok URL as-is if it starts with http', () => {
    const url = 'https://www.tiktok.com/@user/video/123';
    expect(buildPostUrl('TIKTOK', url)).toBe(url);
  });

  it('builds TikTok video URL from ID', () => {
    expect(buildPostUrl('TIKTOK', '7412345678')).toBe('https://www.tiktok.com/video/7412345678');
  });
});

describe('formatPlatformLine', () => {
  it('formats success line with URL', () => {
    const line = formatPlatformLine('INSTAGRAM', true, 'https://www.instagram.com/p/ABC/');
    expect(line).toContain('✅');
    expect(line).toContain('Instagram');
    expect(line).toContain('https://www.instagram.com/p/ABC/');
  });

  it('formats success line without URL', () => {
    const line = formatPlatformLine('TIKTOK', true);
    expect(line).toContain('✅');
    expect(line).toContain('Publicado');
  });

  it('formats failure line with token error', () => {
    const line = formatPlatformLine('LINKEDIN', false, undefined, '401 unauthorized token');
    expect(line).toContain('❌');
    expect(line).toContain('Token expirado');
  });

  it('formats failure line with rate limit error', () => {
    const line = formatPlatformLine('YOUTUBE', false, undefined, 'quota exceeded 429');
    expect(line).toContain('❌');
    expect(line).toContain('Limite de publicações');
  });
});

describe('buildNotificationMessage', () => {
  it('full success: shows 🎉 and all platform links', () => {
    const results = [
      { platform: 'INSTAGRAM' as const, success: true, postUrl: 'https://instagram.com/p/1' },
      { platform: 'TIKTOK' as const, success: true, postUrl: 'https://tiktok.com/@u/v/2' },
    ];
    const msg = buildNotificationMessage(results);
    expect(msg).toContain('🎉');
    expect(msg).toContain('Instagram');
    expect(msg).toContain('TikTok');
    expect(msg).not.toContain('retentar');
  });

  it('partial failure: shows ⚠️ and retentar instruction', () => {
    const results = [
      { platform: 'INSTAGRAM' as const, success: true, postUrl: 'https://instagram.com/p/1' },
      { platform: 'YOUTUBE' as const, success: false, error: '401 token expired' },
    ];
    const msg = buildNotificationMessage(results);
    expect(msg).toContain('⚠️');
    expect(msg).toContain('retentar');
  });

  it('total failure: shows ❌ and reconnect instruction', () => {
    const results = [
      { platform: 'INSTAGRAM' as const, success: false, error: '401 unauthorized' },
      { platform: 'TIKTOK' as const, success: false, error: '401 unauthorized' },
    ];
    const msg = buildNotificationMessage(results);
    expect(msg).toContain('❌');
    expect(msg).toContain('settings/social');
  });

  it('includes client name when provided (AC5 — agência)', () => {
    const results = [{ platform: 'INSTAGRAM' as const, success: true, postUrl: 'https://ig.com' }];
    const msg = buildNotificationMessage(results, 'Clínica Beleza Total');
    expect(msg).toContain('Clínica Beleza Total');
    expect(msg).toContain('👤');
  });
});
