import Ably from 'ably';

export const ABLY_CHANNEL = 'line-webchat';

export type RealtimeEventName = 'inbound' | 'outbound';

export interface RealtimeEvent {
  userId: string;
  timestamp: number;
}

let restClient: Ably.Rest | null = null;

export function isAblyConfigured(): boolean {
  return Boolean(process.env.ABLY_API_KEY);
}

function getRestClient(): Ably.Rest | null {
  if (!isAblyConfigured()) return null;
  if (!restClient) {
    restClient = new Ably.Rest({ key: process.env.ABLY_API_KEY! });
  }
  return restClient;
}

/**
 * Realtime delivery is a latency optimisation on top of polling, so a failure
 * here must never surface to the caller that produced the message.
 */
export async function publishRealtimeEvent(
  name: RealtimeEventName,
  userId: string,
): Promise<void> {
  const client = getRestClient();
  if (!client) return;

  try {
    const event: RealtimeEvent = { userId, timestamp: Date.now() };
    await client.channels.get(ABLY_CHANNEL).publish(name, event);
  } catch (error) {
    console.error('Ably publish failed:', error);
  }
}

export async function createTokenRequest(clientId: string) {
  const client = getRestClient();
  if (!client) throw new Error('Ably is not configured');

  return client.auth.createTokenRequest({
    clientId,
    capability: { [ABLY_CHANNEL]: ['subscribe'] },
  });
}
