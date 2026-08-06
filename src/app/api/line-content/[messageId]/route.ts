import { NextRequest, NextResponse } from 'next/server';
import { fetchLineMessageContent } from '@/lib/line';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const { messageId } = await params;
    const { contentType, buffer } = await fetchLineMessageContent(messageId);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('LINE content error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load image' },
      { status: 500 },
    );
  }
}
