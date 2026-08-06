import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/messages/[userId]/route';
import { makeMessage, makeRequest } from '@/tests/helpers';

const getMessages = vi.fn();
const markUserRead = vi.fn();

vi.mock('@/lib/store', () => ({
  getMessages: (...args: unknown[]) => getMessages(...args),
  markUserRead: (...args: unknown[]) => markUserRead(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getMessages.mockResolvedValue([makeMessage()]);
  markUserRead.mockResolvedValue(undefined);
});

describe('GET /api/messages/[userId]', () => {
  it('decodes the user id from the path', async () => {
    const response = await GET(makeRequest('http://localhost/api/messages/U%2F1'), {
      params: Promise.resolve({ userId: 'U%2F1' }),
    });

    expect(response.status).toBe(200);
    expect(getMessages).toHaveBeenCalledWith('U/1');
    expect(await response.json()).toEqual({ messages: [makeMessage()] });
  });

  it('marks the conversation read when asked', async () => {
    await GET(makeRequest('http://localhost/api/messages/U1?markRead=true'), {
      params: Promise.resolve({ userId: 'U1' }),
    });

    expect(markUserRead).toHaveBeenCalledWith('U1');
  });

  it('still returns messages when marking read fails', async () => {
    markUserRead.mockRejectedValue(new Error('write failed'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await GET(makeRequest('http://localhost/api/messages/U1?markRead=true'), {
      params: Promise.resolve({ userId: 'U1' }),
    });

    expect(response.status).toBe(200);
    expect(log).toHaveBeenCalled();
    expect(await response.json()).toEqual({ messages: [makeMessage()] });
  });

  it('returns 500 when loading messages fails', async () => {
    getMessages.mockRejectedValue(new Error('store down'));

    const response = await GET(makeRequest('http://localhost/api/messages/U1'), {
      params: Promise.resolve({ userId: 'U1' }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      messages: [],
      error: 'store down',
    });
  });
});
