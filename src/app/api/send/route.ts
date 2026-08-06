import { NextRequest, NextResponse } from 'next/server';
import { pushTextMessage } from '@/lib/line';
import { addMessage } from '@/lib/store';
import { publishRealtimeEvent } from '@/lib/ably';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId, text } = (await req.json()) as {
      userId?: string;
      text?: string;
    };

    if (!userId || !text?.trim()) {
      return NextResponse.json(
        { error: 'userId and text are required' },
        { status: 400 },
      );
    }

    const trimmed = text.trim();
    await pushTextMessage(userId, trimmed);
    const message = await addMessage(userId, 'outbound', trimmed, {
      messageType: 'text',
    });
    await publishRealtimeEvent('outbound', userId);

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    console.error('Send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 },
    );
  }
}
