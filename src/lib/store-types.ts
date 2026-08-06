export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'image';

export interface ChatMessage {
  id: string;
  userId: string;
  direction: MessageDirection;
  messageType: MessageType;
  text: string;
  lineMessageId?: string;
  timestamp: number;
}

export interface ChatUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  lastMessage?: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface AddMessageOptions {
  messageType?: MessageType;
  lineMessageId?: string;
  profile?: { displayName: string; pictureUrl?: string };
}

/** Whole-store snapshot as it is serialised to durable storage. */
export interface PersistedStore {
  users: Record<string, ChatUser>;
  messages: Record<string, ChatMessage[]>;
}
