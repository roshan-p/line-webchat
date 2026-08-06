import { t } from './i18n';
import type { ChatMessage, ChatUser, ServerConfig } from '@/types/chat';

export const apiRoutes = {
  users: '/api/users',
  messages: (userId: string) => `/api/messages/${encodeURIComponent(userId)}`,
  send: '/api/send',
  health: '/api/health',
  lineContent: (messageId: string) =>
    `/api/line-content/${encodeURIComponent(messageId)}`,
} as const;

export async function fetchServerConfig(): Promise<ServerConfig> {
  const res = await fetch(apiRoutes.health);
  const data = await res.json();
  return {
    persistent: Boolean(data.persistent),
    realtime: Boolean(data.realtime),
  };
}

export async function fetchUsers(): Promise<ChatUser[]> {
  const res = await fetch(apiRoutes.users);
  const data = await res.json();
  return data.users ?? [];
}

export async function fetchMessages(userId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${apiRoutes.messages(userId)}?markRead=true`);
  const data = await res.json();
  return data.messages ?? [];
}

export async function sendMessage(
  userId: string,
  text: string,
): Promise<ChatMessage> {
  const res = await fetch(apiRoutes.send, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? t.errors.sendFailed);
  return data.message;
}
