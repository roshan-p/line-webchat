import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtime } from '@/hooks/useRealtime';
import { REALTIME_CHANNEL } from '@/lib/constants';

type ConnectionHandler = () => void;

function createAblyMock() {
  const handlers: Record<string, ConnectionHandler> = {};
  const subscribe = vi.fn();

  class Realtime {
    connection = {
      on: (event: string, handler: ConnectionHandler) => {
        handlers[event] = handler;
      },
    };
    channels = {
      get: () => ({ subscribe, unsubscribe: vi.fn() }),
    };
    close = vi.fn();
  }

  return {
    Realtime,
    handlers,
    subscribe,
    emit: (event: string) => handlers[event]?.(),
  };
}

beforeEach(() => {
  document.head.innerHTML = '';
  delete window.Ably;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useRealtime', () => {
  it('stays disabled when realtime is turned off', () => {
    const { result } = renderHook(() => useRealtime(false, vi.fn()));
    expect(result.current).toBe('disabled');
  });

  it('connects, subscribes and forwards events', async () => {
    const ably = createAblyMock();
    window.Ably = { Realtime: ably.Realtime as never };

    const onEvent = vi.fn();
    const { result } = renderHook(() => useRealtime(true, onEvent));

    await waitFor(() => expect(result.current).toBe('connecting'));

    act(() => {
      ably.emit('connected');
    });
    expect(result.current).toBe('connected');

    const payload = { userId: 'U1', timestamp: 1 };
    ably.subscribe.mock.calls[0][0]({ data: payload });
    expect(onEvent).toHaveBeenCalledWith(payload);
    expect(ably.subscribe).toHaveBeenCalled();
  });

  it('marks the connection as failed when the CDN script cannot load', async () => {
    const { result } = renderHook(() => useRealtime(true, vi.fn()));

    await waitFor(() => {
      const script = document.querySelector('script');
      expect(script).toBeTruthy();
      script?.onerror?.(new Event('error'));
    });

    await waitFor(() => expect(result.current).toBe('error'));
  });

  it('unsubscribes and closes the client on unmount', async () => {
    const close = vi.fn();
    const unsubscribe = vi.fn();
    const get = vi.fn(() => ({ subscribe: vi.fn(), unsubscribe }));

    class Realtime {
      connection = { on: vi.fn() };
      channels = { get };
      close = close;
    }

    window.Ably = { Realtime: Realtime as never };

    const { unmount } = renderHook(() => useRealtime(true, vi.fn()));
    await waitFor(() => expect(get).toHaveBeenCalledWith(REALTIME_CHANNEL));

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
