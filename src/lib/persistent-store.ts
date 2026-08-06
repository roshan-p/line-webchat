import { isBlobConfigured, loadStoreFromBlob, saveStoreToBlob } from './blob-store';
import type {
  AddMessageOptions,
  ChatMessage,
  ChatUser,
  MessageDirection,
  PersistedStore,
} from './store-types';

const EMPTY_STORE: PersistedStore = { users: {}, messages: {} };
const IMAGE_PREVIEW = '📷 รูปภาพ';

export function isPersistenceConfigured(): boolean {
  return isBlobConfigured();
}

export function getStorageBackend(): 'blob' | 'memory' {
  return isBlobConfigured() ? 'blob' : 'memory';
}

async function loadStore(): Promise<PersistedStore> {
  return (await loadStoreFromBlob()) ?? EMPTY_STORE;
}

async function saveStore(store: PersistedStore): Promise<void> {
  await saveStoreToBlob(store);
}

function createMessage(
  userId: string,
  direction: MessageDirection,
  text: string,
  options: AddMessageOptions,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId,
    direction,
    messageType: options.messageType ?? 'text',
    text,
    lineMessageId: options.lineMessageId,
    timestamp: Date.now(),
  };
}

function applyMessage(
  store: PersistedStore,
  message: ChatMessage,
  profile?: AddMessageOptions['profile'],
) {
  const { userId, direction } = message;
  const preview = message.messageType === 'image' ? IMAGE_PREVIEW : message.text;

  store.messages[userId] = [...(store.messages[userId] ?? []), message];

  const user = store.users[userId];
  if (user) {
    user.displayName = profile?.displayName ?? user.displayName;
    user.pictureUrl = profile?.pictureUrl ?? user.pictureUrl;
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

export async function addMessagePersisted(
  userId: string,
  direction: MessageDirection,
  text: string,
  options: AddMessageOptions = {},
): Promise<ChatMessage> {
  const store = await loadStore();
  const message = createMessage(userId, direction, text, options);
  applyMessage(store, message, options.profile);
  await saveStore(store);
  return message;
}

export async function upsertUserProfilePersisted(
  userId: string,
  profile: { displayName: string; pictureUrl?: string },
) {
  const store = await loadStore();
  applyUserProfile(store, userId, profile);
  await saveStore(store);
}

export async function markUserReadPersisted(userId: string) {
  const store = await loadStore();
  const user = store.users[userId];
  if (!user) return;
  user.unreadCount = 0;
  await saveStore(store);
}

export async function getUsersPersisted(): Promise<ChatUser[]> {
  const store = await loadStore();
  return Object.values(store.users).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export async function getMessagesPersisted(userId: string): Promise<ChatMessage[]> {
  const store = await loadStore();
  return (store.messages[userId] ?? []).map((message) => ({
    ...message,
    messageType: message.messageType ?? 'text',
  }));
}

export interface InboundEvent {
  userId: string;
  profile: { displayName: string; pictureUrl?: string };
  text?: string;
  messageType?: ChatMessage['messageType'];
  lineMessageId?: string;
}

/**
 * Blob storage rewrites the whole file on every save, so concurrent webhooks
 * would clobber each other. Batching them into one load/save cycle avoids that.
 */
export async function ingestInboundEvents(events: InboundEvent[]): Promise<void> {
  if (!events.length) return;

  const store = await loadStore();
  for (const event of events) {
    if (event.text) {
      const message = createMessage(event.userId, 'inbound', event.text, {
        messageType: event.messageType,
        lineMessageId: event.lineMessageId,
      });
      applyMessage(store, message, event.profile);
    } else {
      applyUserProfile(store, event.userId, event.profile);
    }
  }
  await saveStore(store);
}
