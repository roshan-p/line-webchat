import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/ably/auth/route';

const createTokenRequest = vi.fn();
const isAblyConfigured = vi.fn();

vi.mock('@/lib/ably', () => ({
  createTokenRequest: (...args: unknown[]) => createTokenRequest(...args),
  isAblyConfigured: () => isAblyConfigured(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  createTokenRequest.mockResolvedValue({ keyName: 'test' });
});

describe('GET /api/ably/auth', () => {
  it('returns 503 when Ably is not configured', async () => {
    isAblyConfigured.mockReturnValue(false);

    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Ably is not configured' });
  });

  it('returns a subscribe-only token request', async () => {
    isAblyConfigured.mockReturnValue(true);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ keyName: 'test' });
    expect(createTokenRequest).toHaveBeenCalledWith(expect.stringMatching(/^webchat-/));
  });

  it('returns 500 when token creation fails', async () => {
    isAblyConfigured.mockReturnValue(true);
    createTokenRequest.mockRejectedValue(new Error('invalid key'));

    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'invalid key' });
  });
});
