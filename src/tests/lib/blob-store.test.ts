import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get, put } from '@vercel/blob';

vi.mock('@vercel/blob', () => ({
  get: vi.fn(),
  put: vi.fn(),
}));

const mockedGet = vi.mocked(get);
const mockedPut = vi.mocked(put);

describe('blob-store', () => {
  const snapshot = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...snapshot };
  });

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('reports unconfigured when the token is missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const { isBlobConfigured } = await import('@/lib/blob-store');
    expect(isBlobConfigured()).toBe(false);
  });

  it('loads and parses the persisted JSON snapshot', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'token';
    const store = { users: {}, messages: {} };
    mockedGet.mockResolvedValue({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(store)));
          controller.close();
        },
      }),
    } as never);

    const { loadStoreFromBlob } = await import('@/lib/blob-store');
    await expect(loadStoreFromBlob()).resolves.toEqual(store);
    expect(mockedGet).toHaveBeenCalledWith('line-webchat/store.json', {
      access: 'private',
      useCache: false,
    });
  });

  it('returns null when the blob does not exist yet', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'token';
    mockedGet.mockResolvedValue(null as never);

    const { loadStoreFromBlob } = await import('@/lib/blob-store');
    await expect(loadStoreFromBlob()).resolves.toBeNull();
  });

  it('returns null instead of throwing when the blob read fails', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'token';
    mockedGet.mockRejectedValue(new Error('network'));

    const { loadStoreFromBlob } = await import('@/lib/blob-store');
    await expect(loadStoreFromBlob()).resolves.toBeNull();
  });

  it('writes the whole store back as one JSON file', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'token';
    const store = { users: {}, messages: {} };

    const { saveStoreToBlob } = await import('@/lib/blob-store');
    await saveStoreToBlob(store);

    expect(mockedPut).toHaveBeenCalledWith('line-webchat/store.json', JSON.stringify(store), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
  });

  it('skips the write when blob storage is not configured', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const { saveStoreToBlob } = await import('@/lib/blob-store');
    await saveStoreToBlob({ users: {}, messages: {} });

    expect(mockedPut).not.toHaveBeenCalled();
  });
});
