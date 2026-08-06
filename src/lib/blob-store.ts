import { list, put } from '@vercel/blob';
import type { PersistedStore } from './redis-store';

const BLOB_PATH = 'line-webchat/store.json';

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function loadStoreFromBlob(): Promise<PersistedStore | null> {
  if (!isBlobConfigured()) return null;

  try {
    const { blobs } = await list({ prefix: 'line-webchat/', limit: 1 });
    if (!blobs.length) return null;

    const response = await fetch(blobs[0].url);
    if (!response.ok) return null;
    return (await response.json()) as PersistedStore;
  } catch {
    return null;
  }
}

export async function saveStoreToBlob(store: PersistedStore): Promise<void> {
  if (!isBlobConfigured()) return;

  await put(BLOB_PATH, JSON.stringify(store), {
    access: 'private',
    addRandomSuffix: false,
  });
}
