import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/webhook/route';
import { makeRequest, signLineWebhook } from '@/tests/helpers';

const getUserProfile = vi.fn();
const addMessage = vi.fn();
const upsertUserProfile = vi.fn();
const ingestInboundEvents = vi.fn();
const publishRealtimeEvent = vi.fn();

vi.mock('@/lib/line', () => ({
  getChannelSecret: () => process.env.LINE_CHANNEL_SECRET ?? 'secret',
  getUserIdFromEvent: (event: { source?: { type?: string; userId?: string } }) =>
    event.source?.type === 'user' ? event.source.userId ?? null : null,
  getUserProfile: (...args: unknown[]) => getUserProfile(...args),
  parseMessageFromEvent: (event: { type?: string; message?: { type?: string; text?: string } }) => {
    if (event.type !== 'message' || event.message?.type !== 'text') return null;
    return { messageType: 'text', text: event.message.text };
  },
}));

vi.mock('@/lib/store', () => ({
  addMessage: (...args: unknown[]) => addMessage(...args),
  upsertUserProfile: (...args: unknown[]) => upsertUserProfile(...args),
}));

vi.mock('@/lib/persistent-store', () => ({
  isPersistenceConfigured: () => false,
  ingestInboundEvents: (...args: unknown[]) => ingestInboundEvents(...args),
}));

vi.mock('@/lib/ably', () => ({
  publishRealtimeEvent: (...args: unknown[]) => publishRealtimeEvent(...args),
}));

const payload = {
  events: [
    {
      type: 'message',
      source: { type: 'user', userId: 'U1' },
      message: { type: 'text', text: 'hello' },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.LINE_CHANNEL_SECRET = 'secret';
  getUserProfile.mockResolvedValue({ displayName: 'Alice' });
  addMessage.mockResolvedValue({});
  publishRealtimeEvent.mockResolvedValue(undefined);
});

describe('GET /api/webhook', () => {
  it('confirms the endpoint is alive', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });
});

describe('POST /api/webhook', () => {
  it('rejects requests with an invalid signature', async () => {
    const body = JSON.stringify(payload);
    const response = await POST(
      makeRequest('http://localhost/api/webhook', {
        method: 'POST',
        body,
        headers: { 'x-line-signature': 'bad' },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Invalid signature' });
  });

  it('stores inbound messages and publishes after the write', async () => {
    const body = JSON.stringify(payload);
    const response = await POST(
      makeRequest('http://localhost/api/webhook', {
        method: 'POST',
        body,
        headers: { 'x-line-signature': signLineWebhook(body, 'secret') },
      }),
    );

    expect(response.status).toBe(200);
    expect(addMessage).toHaveBeenCalledWith('U1', 'inbound', 'hello', {
      messageType: 'text',
      lineMessageId: undefined,
      profile: { displayName: 'Alice' },
    });
    expect(publishRealtimeEvent).toHaveBeenCalledWith('inbound', 'U1');
    expect(await response.json()).toEqual({ ok: true });
  });

  it('uses timing-safe comparison for the signature', async () => {
    const body = JSON.stringify(payload);
    const valid = signLineWebhook(body, 'secret');
    const tampered = Buffer.from(valid, 'base64');
    tampered[0] ^= 0xff;

    const response = await POST(
      makeRequest('http://localhost/api/webhook', {
        method: 'POST',
        body,
        headers: { 'x-line-signature': tampered.toString('base64') },
      }),
    );

    expect(response.status).toBe(401);
  });

  it('returns 500 when processing throws', async () => {
    addMessage.mockRejectedValue(new Error('store down'));
    const body = JSON.stringify(payload);

    const response = await POST(
      makeRequest('http://localhost/api/webhook', {
        method: 'POST',
        body,
        headers: { 'x-line-signature': signLineWebhook(body, 'secret') },
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'store down' });
  });
});
