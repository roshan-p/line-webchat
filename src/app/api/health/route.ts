import { NextResponse } from 'next/server';
import { isRedisConfigured } from '@/lib/redis-store';
import { getUsers } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const users = await getUsers();
  return NextResponse.json({
    status: 'ok',
    redis: isRedisConfigured(),
    userCount: users.length,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://line-webchat-one.vercel.app'}/api/webhook`,
  });
}
