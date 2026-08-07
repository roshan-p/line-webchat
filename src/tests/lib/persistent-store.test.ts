import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistedStore } from '@/lib/store-types';

const loadStoreFromBlob = vi.fn();
const saveStoreToBlob = vi.fn();
const markInboundMessagesReadOnLine = vi.fn();

vi.mock('@/lib/blob-store', () => ({
  isBlobConfigured: () => true,
  loadStoreFromBlob: (...args: unknown[]) => loadStoreFromBlob(...args),
  saveStoreToBlob: (...args: unknown[]) => saveStoreToBlob(...args),
}));

vi.mock('@/lib/line', () => ({
  markInboundMessagesReadOnLine: (...args: unknown[]) => markInboundMessagesReadOnLine(...args),
}));

import {
  addMessagePersisted,
  getMessagesPersisted,
  getStorageBackend,
  getUsersPersisted,
  ingestInboundEvents,
  isPersistenceConfigured,
  markUserReadPersisted,
} from '@/lib/persistent-store';

const emptyStore = (): PersistedStore => ({ users: {}, messages: {} });

beforeEach(() => {
  vi.clearAllMocks();
  loadStoreFromBlob.mockResolvedValue(emptyStore());
  saveStoreToBlob.mockResolvedValue(undefined);
  markInboundMessagesReadOnLine.mockResolvedValue(undefined);
});

describe('configuration', () => {
  it('reports blob as the active backend when the mock is wired', () => {
    expect(isPersistenceConfigured()).toBe(true);
    expect(getStorageBackend()).toBe('blob');
  });
});

describe('addMessagePersisted', () => {
  it('loads, mutates and saves the whole store in one cycle', async () => {
    const message = await addMessagePersisted('U1', 'inbound', 'hello', {
      profile: { displayName: 'Alice' },
    });

    expect(message.text).toBe('hello');
    expect(saveStoreToBlob).toHaveBeenCalledTimes(1);

    const saved = saveStoreToBlob.mock.calls[0][0] as PersistedStore;
    expect(saved.users.U1.displayName).toBe('Alice');
    expect(saved.messages.U1).toHaveLength(1);
  });
});

describe('getUsersPersisted', () => {
  it('sorts conversations by most recent message', async () => {
    loadStoreFromBlob.mockResolvedValue({
      users: {
        U1: {
          userId: 'U1',
          displayName: 'Older',
          lastMessageAt: 1,
          unreadCount: 0,
        },
        U2: {
          userId: 'U2',
          displayName: 'Newer',
          lastMessageAt: 2,
          unreadCount: 0,
        },
      },
      messages: {},
    });

    const users = await getUsersPersisted();
    expect(users.map((user) => user.userId)).toEqual(['U2', 'U1']);
  });
});

describe('markUserReadPersisted', () => {
  it('clears unread without touching other users', async () => {
    loadStoreFromBlob.mockResolvedValue({
      users: {
        U1: {
          userId: 'U1',
          displayName: 'Alice',
          lastMessageAt: 1,
          unreadCount: 3,
        },
      },
      messages: {},
    });

    await markUserReadPersisted('U1');

    const saved = saveStoreToBlob.mock.calls[0][0] as PersistedStore;
    expect(saved.users.U1.unreadCount).toBe(0);
  });

  it('notifies LINE when the latest inbound message has a markAsReadToken', async () => {
    const inbound = {
      id: 'm1',
      userId: 'U1',
      direction: 'inbound' as const,
      messageType: 'text' as const,
      text: 'hi',
      markAsReadToken: 'token-1',
      timestamp: 1,
    };

    loadStoreFromBlob.mockResolvedValue({
      users: {
        U1: {
          userId: 'U1',
          displayName: 'Alice',
          lastMessageAt: 1,
          unreadCount: 1,
        },
      },
      messages: { U1: [inbound] },
    });

    await markUserReadPersisted('U1');

    expect(markInboundMessagesReadOnLine).toHaveBeenCalledWith([inbound]);
  });
});

describe('getMessagesPersisted', () => {
  it('defaults messageType for legacy rows', async () => {
    loadStoreFromBlob.mockResolvedValue({
      users: {},
      messages: {
        U1: [
          {
            id: 'legacy',
            userId: 'U1',
            direction: 'inbound',
            text: 'hello',
            timestamp: 1,
          } as never,
        ],
      },
    });

    expect((await getMessagesPersisted('U1'))[0].messageType).toBe('text');
  });
});

describe('ingestInboundEvents', () => {
  it('does nothing when the batch is empty', async () => {
    await ingestInboundEvents([]);
    expect(loadStoreFromBlob).not.toHaveBeenCalled();
    expect(saveStoreToBlob).not.toHaveBeenCalled();
  });

  it('writes every event in the batch with a single save', async () => {
    await ingestInboundEvents([
      {
        userId: 'U1',
        profile: { displayName: 'Alice' },
        text: 'first',
      },
      {
        userId: 'U2',
        profile: { displayName: 'Bob' },
        text: 'second',
      },
    ]);

    expect(loadStoreFromBlob).toHaveBeenCalledTimes(1);
    expect(saveStoreToBlob).toHaveBeenCalledTimes(1);

    const saved = saveStoreToBlob.mock.calls[0][0] as PersistedStore;
    expect(saved.messages.U1).toHaveLength(1);
    expect(saved.messages.U2).toHaveLength(1);
  });

  it('can record a profile without a message, such as a follow event', async () => {
    await ingestInboundEvents([
      {
        userId: 'U1',
        profile: { displayName: 'Alice' },
      },
    ]);

    const saved = saveStoreToBlob.mock.calls[0][0] as PersistedStore;
    expect(saved.users.U1.displayName).toBe('Alice');
    expect(saved.messages.U1).toBeUndefined();
  });
});
