import type { ChatMessage as StoredMessage } from '@/lib/store-types';

export type { ChatUser } from '@/lib/store-types';

/** Only set on optimistic messages that have not been confirmed by the server. */
export type DeliveryStatus = 'sending' | 'failed';

/**
 * Messages stored before image support landed have no `messageType`, so the
 * client has to treat it as optional even though new writes always set it.
 */
export type ChatMessage = Omit<StoredMessage, 'messageType'> & {
  messageType?: StoredMessage['messageType'];
  deliveryStatus?: DeliveryStatus;
};

export interface ServerConfig {
  persistent: boolean;
  realtime: boolean;
}
