import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createTokenRequest, isAblyConfigured } from '@/lib/ably';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAblyConfigured()) {
    return NextResponse.json({ error: 'Ably is not configured' }, { status: 503 });
  }

  try {
    const tokenRequest = await createTokenRequest(`webchat-${crypto.randomUUID()}`);
    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error('Ably auth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token request failed' },
      { status: 500 },
    );
  }
}
