import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addMessage,
  getMessages,
  getUsers,
  markUserRead,
  upsertUserProfile,
} from '@/lib/store';

// Without a Blob token the store falls back to memory, which is what these
// exercise. The memory store hangs off a global, so it has to be reset between
// tests or state leaks across them.
beforeEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  global.__lineWebchatMemory = undefined;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('addMessage', () => {
  it('creates the conversation when a user writes in for the first time', async () => {
    await addMessage('U1', 'inbound', 'hello', {
      profile: { displayName: 'Alice', pictureUrl: 'https://example.com/a.jpg' },
    });

    const [user] = await getUsers();
    expect(user).toMatchObject({
      userId: 'U1',
      displayName: 'Alice',
      pictureUrl: 'https://example.com/a.jpg',
      lastMessage: 'hello',
      unreadCount: 1,
    });
  });

  it('falls back to a placeholder name when LINE gives no profile', async () => {
    await addMessage('U1234567890', 'inbound', 'hello');

    const [user] = await getUsers();
    expect(user.displayName).toBe('User U1234567');
  });

  it('counts only inbound messages as unread', async () => {
    await addMessage('U1', 'inbound', 'one');
    await addMessage('U1', 'inbound', 'two');
    await addMessage('U1', 'outbound', 'reply');

    const [user] = await getUsers();
    expect(user.unreadCount).toBe(2);
  });

  it('shows a placeholder preview for images, since there is no text to show', async () => {
    await addMessage('U1', 'inbound', '[รูปภาพ]', {
      messageType: 'image',
      lineMessageId: 'm1',
    });

    const [user] = await getUsers();
    expect(user.lastMessage).toBe('📷 รูปภาพ');
  });

  it('keeps messages in the order they arrived', async () => {
    await addMessage('U1', 'inbound', 'first');
    await addMessage('U1', 'outbound', 'second');

    expect((await getMessages('U1')).map((m) => m.text)).toEqual(['first', 'second']);
  });

  it('keeps conversations apart', async () => {
    await addMessage('U1', 'inbound', 'for one');
    await addMessage('U2', 'inbound', 'for two');

    expect(await getMessages('U1')).toHaveLength(1);
    expect(await getMessages('U2')).toHaveLength(1);
  });
});

describe('getUsers', () => {
  it('puts the most recent conversation first', async () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    await addMessage('U1', 'inbound', 'older');

    vi.setSystemTime(new Date('2026-01-01T11:00:00Z'));
    await addMessage('U2', 'inbound', 'newer');

    expect((await getUsers()).map((u) => u.userId)).toEqual(['U2', 'U1']);
  });

  it('is empty before anyone has written in', async () => {
    expect(await getUsers()).toEqual([]);
  });
});

describe('markUserRead', () => {
  it('clears the badge', async () => {
    await addMessage('U1', 'inbound', 'hello');
    await markUserRead('U1');

    expect((await getUsers())[0].unreadCount).toBe(0);
  });

  it('ignores a user who does not exist rather than throwing', async () => {
    await expect(markUserRead('nobody')).resolves.toBeUndefined();
  });
});

describe('upsertUserProfile', () => {
  it('refreshes the display name on an existing conversation', async () => {
    await addMessage('U1', 'inbound', 'hello', {
      profile: { displayName: 'Old name' },
    });
    await upsertUserProfile('U1', { displayName: 'New name' });

    expect((await getUsers())[0].displayName).toBe('New name');
  });

  it('keeps the existing picture when the new profile has none', async () => {
    await addMessage('U1', 'inbound', 'hello', {
      profile: { displayName: 'Alice', pictureUrl: 'https://example.com/a.jpg' },
    });
    await upsertUserProfile('U1', { displayName: 'Alice' });

    expect((await getUsers())[0].pictureUrl).toBe('https://example.com/a.jpg');
  });

  it('adds a user who has not sent a message yet', async () => {
    await upsertUserProfile('U1', { displayName: 'Alice' });

    expect(await getUsers()).toHaveLength(1);
    expect(await getMessages('U1')).toEqual([]);
  });
});

describe('getMessages', () => {
  it('returns nothing for an unknown conversation', async () => {
    expect(await getMessages('nobody')).toEqual([]);
  });

  it('defaults messageType for rows written before image support existed', async () => {
    global.__lineWebchatMemory = {
      users: new Map(),
      messages: new Map([
        [
          'U1',
          [
            {
              id: 'legacy',
              userId: 'U1',
              direction: 'inbound',
              text: 'hello',
              timestamp: 1,
            } as never,
          ],
        ],
      ]),
    };

    expect((await getMessages('U1'))[0].messageType).toBe('text');
  });
});
