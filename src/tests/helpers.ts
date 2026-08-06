import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import type { ChatMessage, ChatUser } from '@/types/chat';

export function makeUser(overrides: Partial<ChatUser> = {}): ChatUser {
  return {
    userId: 'U1',
    displayName: 'Alice',
    lastMessage: 'hello',
    lastMessageAt: 1,
    unreadCount: 0,
    ...overrides,
  };
}

export function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    userId: 'U1',
    direction: 'outbound',
    messageType: 'text',
    text: 'hello',
    timestamp: 1,
    ...overrides,
  };
}

export function makeRequest(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
): NextRequest {
  return new NextRequest(url, init);
}

export function signLineWebhook(body: string, secret: string): string {
  return crypto.createHmac('SHA256', secret).update(body).digest('base64');
}
