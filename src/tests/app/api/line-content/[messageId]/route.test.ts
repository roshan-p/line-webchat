import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/line-content/[messageId]/route';
import { makeRequest } from '@/tests/helpers';

const fetchLineMessageContent = vi.fn();

vi.mock('@/lib/line', () => ({
  fetchLineMessageContent: (...args: unknown[]) => fetchLineMessageContent(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/line-content/[messageId]', () => {
  it('proxies the image bytes from LINE', async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    fetchLineMessageContent.mockResolvedValue({
      contentType: 'image/jpeg',
      buffer,
    });

    const response = await GET(makeRequest('http://localhost/api/line-content/m1'), {
      params: Promise.resolve({ messageId: 'm1' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600');
    expect(await response.arrayBuffer()).toEqual(buffer);
  });

  it('returns 500 when LINE cannot serve the content', async () => {
    fetchLineMessageContent.mockRejectedValue(new Error('not found'));

    const response = await GET(makeRequest('http://localhost/api/line-content/m1'), {
      params: Promise.resolve({ messageId: 'm1' }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'not found' });
  });
});
