import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/send/route';
import { makeMessage, makeRequest } from '@/tests/helpers';

const pushTextMessage = vi.fn();
const addMessage = vi.fn();
const publishRealtimeEvent = vi.fn();

vi.mock('@/lib/line', () => ({
  pushTextMessage: (...args: unknown[]) => pushTextMessage(...args),
}));

vi.mock('@/lib/store', () => ({
  addMessage: (...args: unknown[]) => addMessage(...args),
}));

vi.mock('@/lib/ably', () => ({
  publishRealtimeEvent: (...args: unknown[]) => publishRealtimeEvent(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  pushTextMessage.mockResolvedValue(undefined);
  addMessage.mockResolvedValue(makeMessage({ id: 'sent-1', text: 'hello' }));
  publishRealtimeEvent.mockResolvedValue(undefined);
});

describe('POST /api/send', () => {
  it('rejects requests with missing fields', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/send', {
        method: 'POST',
        body: JSON.stringify({ userId: 'U1' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'userId and text are required' });
    expect(pushTextMessage).not.toHaveBeenCalled();
  });

  it('pushes to LINE, stores the message and publishes a realtime event', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/send', {
        method: 'POST',
        body: JSON.stringify({ userId: 'U1', text: '  hello  ' }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(pushTextMessage).toHaveBeenCalledWith('U1', 'hello');
    expect(addMessage).toHaveBeenCalledWith('U1', 'outbound', 'hello', {
      messageType: 'text',
    });
    expect(publishRealtimeEvent).toHaveBeenCalledWith('outbound', 'U1');
    expect(body.ok).toBe(true);
    expect(body.message.id).toBe('sent-1');
  });

  it('returns 500 when LINE rejects the push', async () => {
    pushTextMessage.mockRejectedValue(new Error('LINE rejected it'));

    const response = await POST(
      makeRequest('http://localhost/api/send', {
        method: 'POST',
        body: JSON.stringify({ userId: 'U1', text: 'hello' }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'LINE rejected it' });
    expect(addMessage).not.toHaveBeenCalled();
  });
});
