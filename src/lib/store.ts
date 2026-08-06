import type {
  AddMessageOptions,
  ChatMessage,
  ChatUser,
  MessageDirection,
} from './store-types';
import {
  addMessagePersisted,
  getMessagesPersisted,
  getUsersPersisted,
  isPersistenceConfigured,
  markUserReadPersisted,
  upsertUserProfilePersisted,
} from './persistent-store';

export type { ChatMessage, ChatUser, MessageDirection };
export { getStorageBackend, isPersistenceConfigured } from './persistent-store';

interface MemoryStore {
  users: Map<string, ChatUser>;
  messages: Map<string, ChatMessage[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __lineWebchatMemory: MemoryStore | undefined;
}

function getMemory(): MemoryStore {
  if (!global.__lineWebchatMemory) {
    global.__lineWebchatMemory = { users: new Map(), messages: new Map() };
  }
  return global.__lineWebchatMemory;
}

export async function addMessage(
  userId: string,
  direction: MessageDirection,
  text: string,
  options: AddMessageOptions = {},
): Promise<ChatMessage> {
  if (isPersistenceConfigured()) {
    return addMessagePersisted(userId, direction, text, options);
  }

  const { messageType = 'text', lineMessageId, profile } = options;
  const mem = getMemory();
  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId,
    direction,
    messageType,
    text,
    lineMessageId,
    timestamp: Date.now(),
  };

  const preview = messageType === 'image' ? '📷 รูปภาพ' : text;
  const existing = mem.messages.get(userId) ?? [];
  mem.messages.set(userId, [...existing, message]);

  const user = mem.users.get(userId);
  if (user) {
    user.lastMessage = preview;
    user.lastMessageAt = message.timestamp;
    if (direction === 'inbound') user.unreadCount += 1;
  } else {
    mem.users.set(userId, {
      userId,
      displayName: profile?.displayName ?? `User ${userId.slice(0, 8)}`,
      pictureUrl: profile?.pictureUrl,
      lastMessage: preview,
      lastMessageAt: message.timestamp,
      unreadCount: direction === 'inbound' ? 1 : 0,
    });
  }

  return message;
}

export async function upsertUserProfile(
  userId: string,
  profile: { displayName: string; pictureUrl?: string },
) {
  if (isPersistenceConfigured()) {
    return upsertUserProfilePersisted(userId, profile);
  }

  const mem = getMemory();
  const existing = mem.users.get(userId);
  if (existing) {
    existing.displayName = profile.displayName;
    existing.pictureUrl = profile.pictureUrl ?? existing.pictureUrl;
  } else {
    mem.users.set(userId, {
      userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      lastMessageAt: 0,
      unreadCount: 0,
    });
  }
}

export async function markUserRead(userId: string) {
  if (isPersistenceConfigured()) {
    return markUserReadPersisted(userId);
  }
  const user = getMemory().users.get(userId);
  if (user) user.unreadCount = 0;
}

export async function getUsers(): Promise<ChatUser[]> {
  if (isPersistenceConfigured()) return getUsersPersisted();
  return Array.from(getMemory().users.values()).sort(
    (a, b) => b.lastMessageAt - a.lastMessageAt,
  );
}

export async function getMessages(userId: string): Promise<ChatMessage[]> {
  if (isPersistenceConfigured()) return getMessagesPersisted(userId);
  return (getMemory().messages.get(userId) ?? []).map((msg) => ({
    ...msg,
    messageType: msg.messageType ?? 'text',
  }));
}
