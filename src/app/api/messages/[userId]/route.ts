import { NextRequest, NextResponse } from 'next/server';
import { getMessages, markUserRead } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const decodedUserId = decodeURIComponent(userId);

  // Reading messages must not fail if the unread-count write fails.
  if (req.nextUrl.searchParams.get('markRead') === 'true') {
    try {
      await markUserRead(decodedUserId);
    } catch (error) {
      console.error('markUserRead failed:', error);
    }
  }

  try {
    const messages = await getMessages(decodedUserId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('getMessages failed:', error);
    return NextResponse.json(
      { messages: [], error: error instanceof Error ? error.message : 'Failed to load messages' },
      { status: 500 },
    );
  }
}
