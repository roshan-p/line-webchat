import { NextRequest, NextResponse } from 'next/server';
import { getMessages, markUserRead } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const decodedUserId = decodeURIComponent(userId);

  if (req.nextUrl.searchParams.get('markRead') === 'true') {
    await markUserRead(decodedUserId);
  }

  const messages = await getMessages(decodedUserId);
  return NextResponse.json({ messages });
}
