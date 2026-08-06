import { Client, WebhookEvent, TextMessage } from '@line/bot-sdk';

interface ParsedLineMessage {
  messageType: 'text' | 'image';
  text: string;
  lineMessageId?: string;
}

/**
 * Local development has no way to reach LINE: webhooks point at the deployed
 * URL, and pushing to a made-up user id is rejected. Setting LINE_MOCK=1 stubs
 * both directions so the UI can be exercised end to end offline.
 */
export function isLineMocked(): boolean {
  return process.env.LINE_MOCK === '1';
}

function requireEnv(name: 'LINE_CHANNEL_ACCESS_TOKEN' | 'LINE_CHANNEL_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Add it in .env.local`);
  return value;
}

export function getChannelSecret(): string {
  return requireEnv('LINE_CHANNEL_SECRET');
}

function getLineClient(): Client {
  return new Client({
    channelAccessToken: requireEnv('LINE_CHANNEL_ACCESS_TOKEN'),
    channelSecret: requireEnv('LINE_CHANNEL_SECRET'),
  });
}

export async function getUserProfile(userId: string) {
  if (isLineMocked()) {
    return { displayName: `Local ${userId.slice(-4)}` };
  }

  const client = getLineClient();
  try {
    const profile = await client.getProfile(userId);
    return {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
  } catch {
    return {
      displayName: `User ${userId.slice(0, 8)}`,
    };
  }
}

export async function pushTextMessage(userId: string, text: string) {
  if (isLineMocked()) {
    console.log(`[LINE_MOCK] push to ${userId}: ${text}`);
    return;
  }

  const client = getLineClient();
  const message: TextMessage = { type: 'text', text };
  await client.pushMessage(userId, message);
}

export function parseMessageFromEvent(event: WebhookEvent): ParsedLineMessage | null {
  if (event.type !== 'message') return null;

  if (event.message.type === 'text') {
    return {
      messageType: 'text',
      text: event.message.text,
    };
  }

  if (event.message.type === 'image') {
    return {
      messageType: 'image',
      text: '[รูปภาพ]',
      lineMessageId: event.message.id,
    };
  }

  return null;
}

export function getUserIdFromEvent(event: WebhookEvent): string | null {
  if (event.source.type === 'user' && event.source.userId) {
    return event.source.userId;
  }
  return null;
}

export async function fetchLineMessageContent(messageId: string) {
  const response = await fetch(
    `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    {
      headers: { Authorization: `Bearer ${requireEnv('LINE_CHANNEL_ACCESS_TOKEN')}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch LINE content: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await response.arrayBuffer();
  return { contentType, buffer };
}
