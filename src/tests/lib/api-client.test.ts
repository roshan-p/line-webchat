import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiRoutes,
  fetchMessages,
  fetchServerConfig,
  fetchUsers,
  sendMessage,
} from '@/lib/api-client';
import { makeMessage, makeUser } from '@/tests/helpers';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('apiRoutes', () => {
  it('encodes user ids in the messages path', () => {
    expect(apiRoutes.messages('U/a+b')).toBe('/api/messages/U%2Fa%2Bb');
  });

  it('encodes message ids in the line content proxy path', () => {
    expect(apiRoutes.lineContent('m/1')).toBe('/api/line-content/m%2F1');
  });
});

describe('fetchServerConfig', () => {
  it('maps the health response into the shape the UI expects', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ persistent: true, realtime: false }),
    });

    await expect(fetchServerConfig()).resolves.toEqual({
      persistent: true,
      realtime: false,
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/health');
  });
});

describe('fetchUsers', () => {
  it('returns the users array from the API', async () => {
    const users = [makeUser()];
    fetchMock.mockResolvedValue({ json: async () => ({ users }) });

    await expect(fetchUsers()).resolves.toEqual(users);
  });

  it('falls back to an empty list when the field is missing', async () => {
    fetchMock.mockResolvedValue({ json: async () => ({}) });

    await expect(fetchUsers()).resolves.toEqual([]);
  });
});

describe('fetchMessages', () => {
  it('asks the server to mark the conversation read while loading', async () => {
    const messages = [makeMessage()];
    fetchMock.mockResolvedValue({ json: async () => ({ messages }) });

    await expect(fetchMessages('U1')).resolves.toEqual(messages);
    expect(fetchMock).toHaveBeenCalledWith('/api/messages/U1?markRead=true');
  });
});

describe('sendMessage', () => {
  it('returns the stored message on success', async () => {
    const message = makeMessage({ id: 'sent-1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message }),
    });

    await expect(sendMessage('U1', 'hello')).resolves.toEqual(message);
    expect(fetchMock).toHaveBeenCalledWith('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'U1', text: 'hello' }),
    });
  });

  it('throws the server error message when the send fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'LINE rejected it' }),
    });

    await expect(sendMessage('U1', 'hello')).rejects.toThrow('LINE rejected it');
  });

  it('falls back to the Thai default when the server sends no error text', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(sendMessage('U1', 'hello')).rejects.toThrow('ส่งข้อความไม่สำเร็จ');
  });
});
