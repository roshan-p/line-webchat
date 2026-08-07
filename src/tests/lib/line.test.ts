import type { WebhookEvent } from '@line/bot-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getUserIdFromEvent,
  getUserProfile,
  isLineMocked,
  latestMarkAsReadToken,
  markChatAsRead,
  parseMessageFromEvent,
  pushTextMessage,
} from '@/lib/line';

function messageEvent(message: Record<string, unknown>): WebhookEvent {
  return {
    type: 'message',
    mode: 'active',
    timestamp: 1,
    source: { type: 'user', userId: 'U1' },
    message,
  } as unknown as WebhookEvent;
}

describe('parseMessageFromEvent', () => {
  it('reads the body of a text message', () => {
    const parsed = parseMessageFromEvent(messageEvent({ type: 'text', id: 'm1', text: 'hi' }));
    expect(parsed).toEqual({ messageType: 'text', text: 'hi' });
  });

  it('keeps markAsReadToken when Chat is enabled on the LINE account', () => {
    const parsed = parseMessageFromEvent(
      messageEvent({
        type: 'text',
        id: 'm1',
        text: 'hi',
        markAsReadToken: 'token-abc',
      }),
    );
    expect(parsed).toEqual({
      messageType: 'text',
      text: 'hi',
      markAsReadToken: 'token-abc',
    });
  });

  it('keeps the LINE message id for images, since that is how the proxy fetches them', () => {
    const parsed = parseMessageFromEvent(messageEvent({ type: 'image', id: 'm2' }));
    expect(parsed).toEqual({
      messageType: 'image',
      text: '[รูปภาพ]',
      lineMessageId: 'm2',
    });
  });

  it('ignores message types the UI cannot render', () => {
    expect(parseMessageFromEvent(messageEvent({ type: 'sticker', id: 'm3' }))).toBeNull();
  });

  it('ignores non-message events such as follows', () => {
    const follow = { type: 'follow', source: { type: 'user', userId: 'U1' } };
    expect(parseMessageFromEvent(follow as unknown as WebhookEvent)).toBeNull();
  });
});

describe('getUserIdFromEvent', () => {
  it('returns the id for a one to one chat', () => {
    expect(getUserIdFromEvent(messageEvent({ type: 'text', id: 'm1', text: 'hi' }))).toBe('U1');
  });

  it('returns null for group chats, which are out of scope', () => {
    const group = {
      type: 'message',
      source: { type: 'group', groupId: 'G1' },
      message: { type: 'text', id: 'm1', text: 'hi' },
    };
    expect(getUserIdFromEvent(group as unknown as WebhookEvent)).toBeNull();
  });
});

describe('latestMarkAsReadToken', () => {
  it('returns the token from the latest inbound message', () => {
    const token = latestMarkAsReadToken([
      { direction: 'inbound', markAsReadToken: 'old' },
      { direction: 'outbound' },
      { direction: 'inbound', markAsReadToken: 'new' },
    ]);
    expect(token).toBe('new');
  });

  it('returns undefined when no inbound token exists', () => {
    expect(latestMarkAsReadToken([{ direction: 'outbound' }])).toBeUndefined();
  });
});

describe('markChatAsRead', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
    vi.restoreAllMocks();
  });

  it('logs instead of calling LINE under the mock', async () => {
    process.env.LINE_MOCK = '1';
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(markChatAsRead('token-1')).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('[LINE_MOCK] mark as read: token-1');
  });
});

describe('LINE credentials', () => {
  const snapshot = { ...process.env };

  beforeEach(() => {
    delete process.env.LINE_MOCK;
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  });

  afterEach(() => {
    process.env = { ...snapshot };
    vi.restoreAllMocks();
  });

  it('treats the mock as off unless it is exactly 1', () => {
    process.env.LINE_MOCK = 'true';
    expect(isLineMocked()).toBe(false);
  });

  it('fails loudly when a real push has no access token', async () => {
    await expect(pushTextMessage('U1', 'hello')).rejects.toThrow(
      'Missing LINE_CHANNEL_ACCESS_TOKEN',
    );
  });

  it('fakes a profile under the mock so local dev needs no credentials', async () => {
    process.env.LINE_MOCK = '1';
    await expect(getUserProfile('Ulocaldev0001')).resolves.toEqual({
      displayName: 'Local 0001',
    });
  });

  it('logs the push under the mock instead of reaching LINE', async () => {
    process.env.LINE_MOCK = '1';
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(pushTextMessage('U1', 'hello')).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('[LINE_MOCK] push to U1: hello');
  });
});
