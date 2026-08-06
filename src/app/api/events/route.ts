import { NextRequest } from 'next/server';
import { getUsers } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SSE_INTERVAL_MS = 5000;

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const users = await getUsers();
          const payload = JSON.stringify({ users, timestamp: Date.now() });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          controller.enqueue(encoder.encode(': error\n\n'));
        }
      };

      await send();
      const interval = setInterval(send, SSE_INTERVAL_MS);

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
