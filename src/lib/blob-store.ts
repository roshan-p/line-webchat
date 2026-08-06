import { get, put } from '@vercel/blob';
import type { PersistedStore } from './redis-store';

const BLOB_PATH = 'line-webchat/store.json';

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function loadStoreFromBlob(): Promise<PersistedStore | null> {
  if (!isBlobConfigured()) return null;

  try {
    const result = await get(BLOB_PATH, {
      access: 'private',
      useCache: false,
    });
    if (!result) return null;

    const text = await new Response(result.stream).text();
    return JSON.parse(text) as PersistedStore;
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
