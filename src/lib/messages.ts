import type { ChatMessage } from '@/types/chat';

/** Index of the first inbound message among the latest `unreadCount` unread. */
export function firstUnreadMessageIndex(
  messages: ChatMessage[],
  unreadCount: number,
): number | null {
  if (unreadCount <= 0 || messages.length === 0) return null;

  let remaining = unreadCount;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].direction === 'inbound') {
      remaining -= 1;
      if (remaining === 0) return i;
    }
  }

  return null;
}
