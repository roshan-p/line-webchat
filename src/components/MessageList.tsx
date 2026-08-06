'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingState } from './Spinner';
import { t } from '@/lib/i18n';
import type { ChatMessage } from '@/types/chat';

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          <MessageBubble key={message.id} message={message} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
