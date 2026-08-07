'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingState } from './Spinner';
import { t } from '@/lib/i18n';
import { firstUnreadMessageIndex } from '@/lib/messages';
import type { ChatMessage } from '@/types/chat';

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  unreadOnOpen: number;
  onRetry: (messageId: string) => void;
}

export function MessageList({ messages, loading, unreadOnOpen, onRetry }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (loading || messages.length === 0) return;

    if (!initialScrollDone.current) {
      const unreadIndex = firstUnreadMessageIndex(messages, unreadOnOpen);
      const unreadTarget =
        unreadIndex !== null ? itemRefs.current.get(messages[unreadIndex].id) : null;

      if (unreadTarget) {
        unreadTarget.scrollIntoView({ block: 'start', behavior: 'auto' });
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }

      initialScrollDone.current = true;
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, unreadOnOpen]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
      {loading ? (
        <div className="py-8">
          <LoadingState label={t.chat.loadingMessages} />
        </div>
      ) : messages.length === 0 ? (
        <p className="text-center text-sm text-gray-500">{t.chat.emptyConversation}</p>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            ref={(element) => {
              if (element) itemRefs.current.set(message.id, element);
              else itemRefs.current.delete(message.id);
            }}
          >
            <MessageBubble message={message} onRetry={onRetry} />
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
