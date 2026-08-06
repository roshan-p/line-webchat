import type { ChatMessage as StoredMessage } from '@/lib/store-types';

export type { ChatUser, MessageDirection, MessageType } from '@/lib/store-types';

/**
 * Messages stored before image support landed have no `messageType`, so the
 * client has to treat it as optional even though new writes always set it.
 */
export type ChatMessage = Omit<StoredMessage, 'messageType'> & {
  messageType?: StoredMessage['messageType'];
};

export interface ServerConfig {
  persistent: boolean;
  realtime: boolean;
}
