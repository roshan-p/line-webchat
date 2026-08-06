import { Client, WebhookEvent, TextMessage } from '@line/bot-sdk';

export interface ParsedLineMessage {
  messageType: 'text' | 'image';
  text: string;
  lineMessageId?: string;
}

export function getLineConfig() {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelAccessToken || !channelSecret) {
    throw new Error(
      'Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET. Add them in .env.local',
    );
  }

  return { channelAccessToken, channelSecret };
}

export function getLineClient(): Client {
  const { channelAccessToken, channelSecret } = getLineConfig();
  return new Client({ channelAccessToken, channelSecret });
}

export async function getUserProfile(userId: string) {
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
  const { channelAccessToken } = getLineConfig();
  const response = await fetch(
    `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch LINE content: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await response.arrayBuffer();
  return { contentType, buffer };
}
