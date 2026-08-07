import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage, ChatUser } from '@/types/chat';
import type { RealtimeEvent } from '@/lib/ably';

vi.mock('@/lib/api-client', () => ({
  fetchUsers: vi.fn(),
  fetchMessages: vi.fn(),
  sendMessage: vi.fn(),
}));

// Captured so tests can push a realtime event and flip the connection state
// without standing up an Ably client.
let realtimeHandler: (event: RealtimeEvent) => void = () => {};
let realtimeStatus = 'disabled';

vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: (enabled: boolean, onEvent: (event: RealtimeEvent) => void) => {
    realtimeHandler = onEvent;
    return enabled ? realtimeStatus : 'disabled';
  },
}));

const api = await import('@/lib/api-client');

const alice: ChatUser = {
  userId: 'U1',
  displayName: 'Alice',
  lastMessageAt: 1,
  unreadCount: 0,
};

function storedMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'stored-1',
    userId: 'U1',
    direction: 'inbound',
    messageType: 'text',
    text: 'hello',
    timestamp: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  realtimeStatus = 'disabled';
  vi.mocked(api.fetchUsers).mockResolvedValue([alice]);
  vi.mocked(api.fetchMessages).mockResolvedValue([storedMessage()]);
});

async function openChat() {
  const view = renderHook(() => useChat(false));
  await waitFor(() => expect(view.result.current.users).toHaveLength(1));

  act(() => view.result.current.selectUser('U1'));
  await waitFor(() => expect(view.result.current.messages).toHaveLength(1));

  return view;
}

describe('loading', () => {
  it('loads the conversation list on mount', async () => {
    const { result } = renderHook(() => useChat(false));

    await waitFor(() => expect(result.current.usersLoading).toBe(false));
    expect(result.current.users).toEqual([alice]);
  });

  it('survives a failed refresh instead of blanking the list', async () => {
    vi.mocked(api.fetchUsers).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useChat(false));

    await waitFor(() => expect(result.current.usersLoading).toBe(false));
    expect(result.current.users).toEqual([]);
  });

  it('clears the thread when switching away from a chat', async () => {
    const { result } = await openChat();

    act(() => result.current.selectUser(null));

    expect(result.current.messages).toEqual([]);
    expect(result.current.selectedUser).toBeNull();
  });

  it('does not clear messages when the same user is selected again', async () => {
    const { result } = await openChat();
    const messagesBefore = result.current.messages;
    const fetchCalls = vi.mocked(api.fetchMessages).mock.calls.length;

    act(() => result.current.selectUser('U1'));

    expect(result.current.messages).toEqual(messagesBefore);
    expect(vi.mocked(api.fetchMessages).mock.calls.length).toBe(fetchCalls);
  });
});

describe('sending', () => {
  it('shows the message before the server confirms it', async () => {
    let resolveSend: (message: ChatMessage) => void = () => {};
    vi.mocked(api.sendMessage).mockReturnValue(
      new Promise<ChatMessage>((resolve) => {
        resolveSend = resolve;
      }),
    );

    const { result } = await openChat();
    act(() => result.current.send('hi there'));

    const pending = result.current.messages[1];
    expect(pending).toMatchObject({
      text: 'hi there',
      direction: 'outbound',
      deliveryStatus: 'sending',
    });

    await act(async () => {
      resolveSend(storedMessage({ id: 'real-1', direction: 'outbound', text: 'hi there' }));
    });

    expect(result.current.messages[1].id).toBe('real-1');
    expect(result.current.messages[1].deliveryStatus).toBeUndefined();
  });

  it('marks the message failed instead of dropping it', async () => {
    vi.mocked(api.sendMessage).mockRejectedValue(new Error('LINE rejected it'));

    const { result } = await openChat();
    await act(async () => {
      result.current.send('hi there');
    });

    expect(result.current.messages[1]).toMatchObject({
      text: 'hi there',
      deliveryStatus: 'failed',
    });
  });

  it('does nothing when no chat is open', async () => {
    const { result } = renderHook(() => useChat(false));
    await waitFor(() => expect(result.current.usersLoading).toBe(false));

    act(() => result.current.send('hi there'));

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it('does not duplicate the bubble when the push arrives before the response', async () => {
    const sent = storedMessage({ id: 'real-1', direction: 'outbound', text: 'hi there' });
    let resolveSend: (message: ChatMessage) => void = () => {};
    vi.mocked(api.sendMessage).mockReturnValue(
      new Promise<ChatMessage>((resolve) => {
        resolveSend = resolve;
      }),
    );

    const { result } = await openChat();
    act(() => result.current.send('hi there'));

    // The realtime event lands first, so a refetch already pulls in the stored
    // copy while the optimistic one is still in flight.
    vi.mocked(api.fetchMessages).mockResolvedValue([storedMessage(), sent]);
    await act(async () => {
      realtimeHandler({ userId: 'U1', timestamp: 2 });
    });
    await act(async () => {
      resolveSend(sent);
    });

    expect(result.current.messages.filter((m) => m.id === 'real-1')).toHaveLength(1);
    expect(result.current.messages).toHaveLength(2);
  });

  it('keeps an unconfirmed message when a refetch lands mid-flight', async () => {
    vi.mocked(api.sendMessage).mockReturnValue(new Promise<ChatMessage>(() => {}));

    const { result } = await openChat();
    act(() => result.current.send('hi there'));

    await act(async () => {
      realtimeHandler({ userId: 'U1', timestamp: 2 });
    });

    expect(result.current.messages.at(-1)).toMatchObject({
      text: 'hi there',
      deliveryStatus: 'sending',
    });
  });
});

describe('retry', () => {
  it('resends a failed message and swaps in the stored copy', async () => {
    vi.mocked(api.sendMessage).mockRejectedValueOnce(new Error('offline'));

    const { result } = await openChat();
    await act(async () => {
      result.current.send('hi there');
    });

    const failedId = result.current.messages[1].id;
    vi.mocked(api.sendMessage).mockResolvedValueOnce(
      storedMessage({ id: 'real-1', direction: 'outbound', text: 'hi there' }),
    );

    await act(async () => {
      result.current.retry(failedId);
    });

    expect(api.sendMessage).toHaveBeenCalledTimes(2);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].id).toBe('real-1');
    expect(result.current.messages[1].deliveryStatus).toBeUndefined();
  });

  it('leaves the message failed when the retry also fails', async () => {
    vi.mocked(api.sendMessage).mockRejectedValue(new Error('offline'));

    const { result } = await openChat();
    await act(async () => {
      result.current.send('hi there');
    });

    const failedId = result.current.messages[1].id;
    await act(async () => {
      result.current.retry(failedId);
    });

    expect(result.current.messages[1].deliveryStatus).toBe('failed');
  });

  it('ignores a retry for a message that did not fail', async () => {
    const { result } = await openChat();

    act(() => result.current.retry('stored-1'));

    expect(api.sendMessage).not.toHaveBeenCalled();
  });
});

describe('staying up to date', () => {
  it('refreshes the open conversation when a realtime event names it', async () => {
    const { result } = await openChat();
    vi.mocked(api.fetchMessages).mockResolvedValue([storedMessage(), storedMessage({ id: 's2' })]);

    await act(async () => {
      realtimeHandler({ userId: 'U1', timestamp: 2 });
    });

    expect(result.current.messages).toHaveLength(2);
  });

  it('refreshes only the list when the event is for another chat', async () => {
    const { result } = await openChat();
    vi.mocked(api.fetchMessages).mockClear();

    await act(async () => {
      realtimeHandler({ userId: 'U2', timestamp: 2 });
    });

    expect(api.fetchMessages).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(1);
  });

  it('polls while realtime is unavailable', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderHook(() => useChat(false));

    await vi.waitFor(() => expect(api.fetchUsers).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    expect(vi.mocked(api.fetchUsers).mock.calls.length).toBeGreaterThan(1);
    vi.useRealTimers();
  });

  it('stops polling once realtime connects, since pushes cover it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    realtimeStatus = 'connected';
    renderHook(() => useChat(true));

    await vi.waitFor(() => expect(api.fetchUsers).toHaveBeenCalled());
    const afterConnect = vi.mocked(api.fetchUsers).mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });

    expect(vi.mocked(api.fetchUsers).mock.calls.length).toBe(afterConnect);
    vi.useRealTimers();
  });

  it('catches up when the tab becomes visible again', async () => {
    renderHook(() => useChat(false));
    await waitFor(() => expect(api.fetchUsers).toHaveBeenCalled());
    vi.mocked(api.fetchUsers).mockClear();

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(api.fetchUsers).toHaveBeenCalled();
  });
});
