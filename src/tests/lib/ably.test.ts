import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REALTIME_CHANNEL } from '@/lib/constants';

const publish = vi.fn();
const createTokenRequest = vi.fn();

vi.mock('ably', () => {
  class Rest {
    channels = {
      get: () => ({ publish }),
    };
    auth = { createTokenRequest };
  }

  return { default: { Rest } };
});

describe('ably', () => {
  const snapshot = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...snapshot };
    createTokenRequest.mockResolvedValue({ keyName: 'test' });
    publish.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('reports unconfigured when the API key is missing', async () => {
    delete process.env.ABLY_API_KEY;
    const { isAblyConfigured } = await import('@/lib/ably');
    expect(isAblyConfigured()).toBe(false);
  });

  it('publishes an event on the shared channel', async () => {
    process.env.ABLY_API_KEY = 'test-key';
    const { publishRealtimeEvent } = await import('@/lib/ably');

    await publishRealtimeEvent('inbound', 'U1');

    expect(publish).toHaveBeenCalledWith(
      'inbound',
      expect.objectContaining({ userId: 'U1', timestamp: expect.any(Number) }),
    );
  });

  it('does nothing when Ably is not configured', async () => {
    delete process.env.ABLY_API_KEY;
    const { publishRealtimeEvent } = await import('@/lib/ably');

    await expect(publishRealtimeEvent('outbound', 'U1')).resolves.toBeUndefined();
    expect(publish).not.toHaveBeenCalled();
  });

  it('swallows publish failures so the caller is not affected', async () => {
    process.env.ABLY_API_KEY = 'test-key';
    publish.mockRejectedValue(new Error('network'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { publishRealtimeEvent } = await import('@/lib/ably');
    await expect(publishRealtimeEvent('inbound', 'U1')).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });

  it('issues a subscribe-only token for one channel', async () => {
    process.env.ABLY_API_KEY = 'test-key';
    const { createTokenRequest: issue } = await import('@/lib/ably');

    await expect(issue('webchat-1')).resolves.toEqual({ keyName: 'test' });
    expect(createTokenRequest).toHaveBeenCalledWith({
      clientId: 'webchat-1',
      capability: { [REALTIME_CHANNEL]: ['subscribe'] },
    });
  });

  it('refuses to issue a token when Ably is not configured', async () => {
    delete process.env.ABLY_API_KEY;
    const { createTokenRequest: issue } = await import('@/lib/ably');

    await expect(issue('webchat-1')).rejects.toThrow('Ably is not configured');
  });
});
