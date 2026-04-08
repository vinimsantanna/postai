import { describe, it, expect } from 'vitest';
import { parseMessage, parsePhoneNumber } from '@/services/whatsapp/message-parser';
import type { EvolutionWebhookEvent } from '@/domain/types';

function makeEvent(overrides: Partial<EvolutionWebhookEvent['data']> = {}): EvolutionWebhookEvent {
  return {
    event: 'messages.upsert',
    instance: 'postai',
    data: {
      key: { remoteJid: '5573988548309@s.whatsapp.net', fromMe: false, id: 'msg123' },
      messageTimestamp: 1712000000,
      ...overrides,
    },
  };
}

describe('parsePhoneNumber', () => {
  it('extracts number from JID', () => {
    expect(parsePhoneNumber('5573988548309@s.whatsapp.net')).toBe('5573988548309');
  });
});

describe('parseMessage', () => {
  it('returns null for messages sent by the bot', () => {
    const event = makeEvent({ key: { remoteJid: '5573988548309@s.whatsapp.net', fromMe: true, id: 'msg1' } });
    expect(parseMessage(event)).toBeNull();
  });

  it('returns null for non-upsert events', () => {
    const event: EvolutionWebhookEvent = {
      event: 'connection.update',
      instance: 'postai',
      data: {
        key: { remoteJid: '5573988548309@s.whatsapp.net', fromMe: false, id: 'msg1' },
      },
    };
    expect(parseMessage(event)).toBeNull();
  });

  it('parses text message', () => {
    const event = makeEvent({ message: { conversation: '  Olá!  ' } });
    const result = parseMessage(event);
    expect(result).toMatchObject({ type: 'text', text: 'Olá!', from: '5573988548309' });
  });

  it('parses video message', () => {
    const event = makeEvent({
      message: { videoMessage: { url: 'https://example.com/video.mp4', mimetype: 'video/mp4' } },
    });
    const result = parseMessage(event);
    expect(result).toMatchObject({ type: 'video', mediaUrl: 'https://example.com/video.mp4' });
  });

  it('parses image message', () => {
    const event = makeEvent({
      message: { imageMessage: { url: 'https://example.com/img.jpg', mimetype: 'image/jpeg', caption: 'foto' } },
    });
    const result = parseMessage(event);
    expect(result).toMatchObject({ type: 'image', text: 'foto' });
  });

  it('parses button response', () => {
    const event = makeEvent({
      message: { buttonsResponseMessage: { selectedButtonId: 'btn_1', selectedDisplayText: 'Confirmar' } },
    });
    const result = parseMessage(event);
    expect(result).toMatchObject({ type: 'button', text: 'btn_1' });
  });

  it('returns unknown type for unrecognized message', () => {
    const event = makeEvent({ message: {} });
    const result = parseMessage(event);
    expect(result?.type).toBe('unknown');
  });
});
