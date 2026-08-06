import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent } from '@line/bot-sdk';
import {
  getLineConfig,
  getUserIdFromEvent,
  getUserProfile,
  parseMessageFromEvent,
} from '@/lib/line';
import { ingestInboundEvents } from '@/lib/redis-store';
import { isPersistenceConfigured } from '@/lib/redis-store';
import { addMessage, upsertUserProfile } from '@/lib/store';
import { publishRealtimeEvent } from '@/lib/ably';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const { channelSecret } = getLineConfig();
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

async function handleEvents(events: WebhookEvent[]) {
  const prepared = [];

  for (const event of events) {
    const userId = getUserIdFromEvent(event);
    if (!userId) continue;

    const profile = await getUserProfile(userId);
    const parsed = parseMessageFromEvent(event);

    prepared.push({
      userId,
      profile,
      text: parsed?.text,
      messageType: parsed?.messageType,
      lineMessageId: parsed?.lineMessageId,
    });
  }

  if (!prepared.length) return;

  if (isPersistenceConfigured()) {
    await ingestInboundEvents(prepared);
  } else {
    for (const item of prepared) {
      if (item.text) {
        await addMessage(item.userId, 'inbound', item.text, {
          messageType: item.messageType,
          lineMessageId: item.lineMessageId,
          profile: item.profile,
        });
      } else {
        await upsertUserProfile(item.userId, item.profile);
      }
    }
  }

  // Published only after the write settles so a refetch sees the new message.
  const userIds = [...new Set(prepared.map((item) => item.userId))];
  await Promise.all(userIds.map((userId) => publishRealtimeEvent('inbound', userId)));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-line-signature');

    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body) as { events: WebhookEvent[] };
    await handleEvents(payload.events ?? []);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'LINE webhook endpoint is running. Configure this URL in LINE Developers Console.',
  });
}
