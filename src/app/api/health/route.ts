import { NextResponse } from 'next/server';
import { getStorageBackend, isPersistenceConfigured } from '@/lib/persistent-store';
import { getUsers } from '@/lib/store';
import { isAblyConfigured } from '@/lib/ably';

export const dynamic = 'force-dynamic';

export async function GET() {
  const users = await getUsers();
  return NextResponse.json({
    status: 'ok',
    storage: getStorageBackend(),
    persistent: isPersistenceConfigured(),
    realtime: isAblyConfigured(),
    userCount: users.length,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://line-webchat-one.vercel.app'}/api/webhook`,
  });
}
