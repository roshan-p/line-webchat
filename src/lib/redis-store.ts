import { Redis } from '@upstash/redis';
import { loadStoreFromBlob, saveStoreToBlob, isBlobConfigured } from './blob-store';
import type {
  AddMessageOptions,
  ChatMessage,
  ChatUser,
  MessageDirection,
} from './store-types';

const STORE_KEY = 'line-webchat:store';

export interface PersistedStore {
  users: Record<string, ChatUser>;
  messages: Record<string, ChatMessage[]>;
}

const EMPTY_STORE: PersistedStore = { users: {}, messages: {} };

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function isPersistenceConfigured(): boolean {
  return isRedisConfigured() || isBlobConfigured();
}

export function getStorageBackend(): 'redis' | 'blob' | 'memory' {
  if (isRedisConfigured()) return 'redis';
  if (isBlobConfigured()) return 'blob';
  return 'memory';
}

export async function loadStore(): Promise<PersistedStore> {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get<PersistedStore>(STORE_KEY);
    return data ?? EMPTY_STORE;
  }

  const blobData = await loadStoreFromBlob();
  return blobData ?? EMPTY_STORE;
}

export async function saveStore(store: PersistedStore): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(STORE_KEY, store);
    return;
  }

  await saveStoreToBlob(store);
}

export async function addMessagePersisted(
  userId: string,
  direction: MessageDirection,
  text: string,
  options: AddMessageOptions = {},
): Promise<ChatMessage> {
  const { messageType = 'text', lineMessageId, profile } = options;
  const store = await loadStore();
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
  const existing = store.messages[userId] ?? [];
  store.messages[userId] = [...existing, message];

  const user = store.users[userId];
  if (user) {
    user.lastMessage = preview;
    user.lastMessageAt = message.timestamp;
    if (direction === 'inbound') user.unreadCount += 1;
  } else {
    store.users[userId] = {
      userId,
      displayName: profile?.displayName ?? `User ${userId.slice(0, 8)}`,
      pictureUrl: profile?.pictureUrl,
      lastMessage: preview,
      lastMessageAt: message.timestamp,
      unreadCount: direction === 'inbound' ? 1 : 0,
    };
  }

  await saveStore(store);
  return message;
}

export async function upsertUserProfilePersisted(
  userId: string,
  profile: { displayName: string; pictureUrl?: string },
) {
  const store = await loadStore();
  const existing = store.users[userId];
  if (existing) {
    existing.displayName = profile.displayName;
    existing.pictureUrl = profile.pictureUrl ?? existing.pictureUrl;
  } else {
    store.users[userId] = {
      userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      lastMessageAt: 0,
      unreadCount: 0,
    };
  }
  await saveStore(store);
}

export async function markUserReadPersisted(userId: string) {
  const store = await loadStore();
  const user = store.users[userId];
  if (user) {
    user.unreadCount = 0;
    await saveStore(store);
  }
}

export async function getUsersPersisted(): Promise<ChatUser[]> {
  const store = await loadStore();
  return Object.values(store.users).sort(
    (a, b) => b.lastMessageAt - a.lastMessageAt,
  );
}

export async function getMessagesPersisted(userId: string): Promise<ChatMessage[]> {
  const store = await loadStore();
  return (store.messages[userId] ?? []).map((msg) => ({
    ...msg,
    messageType: msg.messageType ?? 'text',
  }));
}

function applyInboundMessage(
  store: PersistedStore,
  userId: string,
  text: string,
  options: AddMessageOptions,
): ChatMessage {
  const { messageType = 'text', lineMessageId, profile } = options;
  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId,
    direction: 'inbound',
    messageType,
    text,
    lineMessageId,
    timestamp: Date.now(),
  };

  const preview = messageType === 'image' ? '📷 รูปภาพ' : text;
  const existing = store.messages[userId] ?? [];
  store.messages[userId] = [...existing, message];

  const user = store.users[userId];
  if (user) {
    user.displayName = profile?.displayName ?? user.displayName;
    user.pictureUrl = profile?.pictureUrl ?? user.pictureUrl;
    user.lastMessage = preview;
    user.lastMessageAt = message.timestamp;
    user.unreadCount += 1;
  } else {
    store.users[userId] = {
      userId,
      displayName: profile?.displayName ?? `User ${userId.slice(0, 8)}`,
      pictureUrl: profile?.pictureUrl,
      lastMessage: preview,
      lastMessageAt: message.timestamp,
      unreadCount: 1,
    };
  }

  return message;
}

function applyUserProfile(
  store: PersistedStore,
  userId: string,
  profile: { displayName: string; pictureUrl?: string },
) {
  const existing = store.users[userId];
  if (existing) {
    existing.displayName = profile.displayName;
    existing.pictureUrl = profile.pictureUrl ?? existing.pictureUrl;
  } else {
    store.users[userId] = {
      userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      lastMessageAt: 0,
      unreadCount: 0,
    };
  }
}

/** Single load/save cycle to avoid Blob race conditions on concurrent webhooks. */
export async function ingestInboundEvents(
  events: Array<{
    userId: string;
    profile: { displayName: string; pictureUrl?: string };
    text?: string;
    messageType?: 'text' | 'image';
    lineMessageId?: string;
  }>,
): Promise<void> {
  if (!events.length) return;

  const store = await loadStore();
  for (const event of events) {
    if (event.text) {
      applyInboundMessage(store, event.userId, event.text, {
        messageType: event.messageType,
        lineMessageId: event.lineMessageId,
        profile: event.profile,
      });
    } else {
      applyUserProfile(store, event.userId, event.profile);
    }
  }
  await saveStore(store);
}
