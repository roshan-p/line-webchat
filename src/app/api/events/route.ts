import { NextRequest } from 'next/server';
import { getUsers } from '@/lib/store';
import { isRedisConfigured } from '@/lib/redis-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        const users = await getUsers();
        const payload = JSON.stringify({ users, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      await send();
      const interval = setInterval(send, 2000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    headers: { 'X-Redis-Configured': isRedisConfigured() ? 'true' : 'false' },
  });
}
