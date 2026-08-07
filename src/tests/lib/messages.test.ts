import { describe, expect, it } from 'vitest';
import { firstUnreadMessageIndex } from '@/lib/messages';
import type { ChatMessage } from '@/types/chat';

function message(
  direction: ChatMessage['direction'],
  id: string,
): ChatMessage {
  return {
    id,
    userId: 'U1',
    direction,
    messageType: 'text',
    text: id,
    timestamp: 1,
  };
}

describe('firstUnreadMessageIndex', () => {
  it('returns null when there is nothing unread', () => {
    expect(firstUnreadMessageIndex([message('inbound', 'a')], 0)).toBeNull();
  });

  it('finds the first inbound among the latest unread batch', () => {
    const messages = [
      message('inbound', 'a'),
      message('outbound', 'b'),
      message('inbound', 'c'),
      message('inbound', 'd'),
    ];

    expect(firstUnreadMessageIndex(messages, 2)).toBe(2);
  });

  it('skips outbound messages when counting from the end', () => {
    const messages = [
      message('inbound', 'a'),
      message('outbound', 'b'),
      message('inbound', 'c'),
    ];

    expect(firstUnreadMessageIndex(messages, 1)).toBe(2);
  });

  it('returns null when the latest message is from the sender', () => {
    const messages = [
      message('inbound', 'a'),
      message('inbound', 'b'),
      message('outbound', 'c'),
    ];

    expect(firstUnreadMessageIndex(messages, 2)).toBeNull();
  });
});
