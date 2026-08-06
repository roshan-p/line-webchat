'use client';

import { useEffect, useRef, useState } from 'react';
import type { Realtime, RealtimeChannel } from 'ably';
import { REALTIME_CHANNEL } from '@/lib/constants';
import type { RealtimeEvent } from '@/lib/ably';

// Bundling Ably fails to compile: its published build uses `super()` inside an
// arrow function, which the Next.js SWC loader cannot parse. Loading the
// prebuilt browser script sidesteps that and keeps it out of the app bundle.
const ABLY_CDN = 'https://cdn.ably.com/lib/ably.min-2.js';

export type RealtimeStatus = 'disabled' | 'connecting' | 'connected' | 'error';

interface AblyGlobal {
  Realtime: new (options: Record<string, unknown>) => Realtime;
}

declare global {
  interface Window {
    Ably?: AblyGlobal;
  }
}

let scriptPromise: Promise<AblyGlobal> | null = null;

function loadAbly(): Promise<AblyGlobal> {
  if (window.Ably) return Promise.resolve(window.Ably);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<AblyGlobal>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = ABLY_CDN;
    script.async = true;
    script.onload = () =>
      window.Ably
        ? resolve(window.Ably)
        : reject(new Error('Ably script loaded without a global'));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load Ably'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Subscribes to Ably when the server has it configured. `onEvent` is kept in a
 * ref so callers can pass an inline handler without tearing down the connection.
 */
export function useRealtime(
  enabled: boolean,
  onEvent: (event: RealtimeEvent) => void,
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('disabled');
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) {
      setStatus('disabled');
      return;
    }

    let client: Realtime | null = null;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    setStatus('connecting');

    loadAbly()
      .then((AblyLib) => {
        if (cancelled) return;

        client = new AblyLib.Realtime({
          authUrl: '/api/ably/auth',
          // The polling fallback already covers outages, so retrying
          // aggressively would only burn connection minutes.
          disconnectedRetryTimeout: 15000,
          suspendedRetryTimeout: 30000,
        });

        client.connection.on('connected', () => setStatus('connected'));
        client.connection.on('disconnected', () => setStatus('connecting'));
        client.connection.on('failed', () => setStatus('error'));

        channel = client.channels.get(REALTIME_CHANNEL);
        channel.subscribe((message) => {
          handlerRef.current(message.data as RealtimeEvent);
        });
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      channel?.unsubscribe();
      client?.close();
    };
  }, [enabled]);

  return status;
}
