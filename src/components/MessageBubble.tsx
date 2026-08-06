import { RetryIcon } from './icons';
import { apiRoutes } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { ChatMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry: (messageId: string) => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const outbound = message.direction === 'outbound';
  const isImage = message.messageType === 'image' && Boolean(message.lineMessageId);
  const sending = message.deliveryStatus === 'sending';
  const failed = message.deliveryStatus === 'failed';

  return (
    <div className={`mb-3 flex items-end gap-1.5 ${outbound ? 'justify-end' : 'justify-start'}`}>
      {failed && (
        <button
          type="button"
          onClick={() => onRetry(message.id)}
          title={t.chat.resend}
          aria-label={t.chat.resend}
          className="mb-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-400"
        >
          <RetryIcon />
        </button>
      )}
      <div
        className={`max-w-[80%] rounded-2xl text-sm transition-opacity sm:max-w-sm lg:max-w-md ${
          outbound
            ? 'rounded-br-sm bg-line-green text-line-ink'
            : 'rounded-bl-sm bg-line-panel text-gray-100'
        } ${isImage ? 'overflow-hidden p-1' : 'px-4 py-2'} ${sending ? 'opacity-60' : ''}`}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={apiRoutes.lineContent(message.lineMessageId!)}
            alt={t.chat.imageAlt}
            className="max-h-64 w-full rounded-xl object-contain"
          />
        ) : (
          <p className="whitespace-pre-wrap break-words px-3 py-1">{message.text}</p>
        )}
        <p
          className={`mt-1 px-3 pb-1 text-right text-xs ${
            outbound ? 'text-line-ink/60' : 'text-gray-500'
          }`}
        >
          {sending ? t.chat.sending : formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
