import { apiRoutes } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { ChatMessage } from '@/types/chat';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const outbound = message.direction === 'outbound';
  const isImage = message.messageType === 'image' && Boolean(message.lineMessageId);

  return (
    <div className={`mb-3 flex ${outbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl text-sm sm:max-w-sm lg:max-w-md ${
          outbound
            ? 'rounded-br-sm bg-line-green text-line-ink'
            : 'rounded-bl-sm bg-line-panel text-gray-100'
        } ${isImage ? 'overflow-hidden p-1' : 'px-4 py-2'}`}
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
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
