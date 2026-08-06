import { ChatHeader } from './ChatHeader';
import { MessageComposer } from './MessageComposer';
import { MessageList } from './MessageList';
import { ChatBubbleIcon } from './icons';
import { t } from '@/lib/i18n';
import type { ChatMessage, ChatUser } from '@/types/chat';

interface ChatPanelProps {
  user: ChatUser | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  sending: boolean;
  error: string | null;
  onBack: () => void;
  onSend: (text: string) => Promise<boolean>;
  /** Mobile shows one pane at a time, so the chat hides while browsing the list. */
  hiddenOnMobile: boolean;
}

function NoChatSelected() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-gray-500">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-line-panel text-line-green">
        <ChatBubbleIcon />
      </div>
      <p className="text-sm">{t.chat.selectUser}</p>
    </div>
  );
}

export function ChatPanel({
  user,
  messages,
  messagesLoading,
  sending,
  error,
  onBack,
  onSend,
  hiddenOnMobile,
}: ChatPanelProps) {
  return (
    <main
      className={`${hiddenOnMobile ? 'hidden md:flex' : 'flex'} min-w-0 flex-1 flex-col`}
    >
      {user ? (
        <>
          <ChatHeader user={user} onBack={onBack} />
          <MessageList messages={messages} loading={messagesLoading} />
          {error && (
            <div className="mx-4 mb-2 rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300 md:mx-6">
              {error}
            </div>
          )}
          <MessageComposer sending={sending} onSend={onSend} />
        </>
      ) : (
        <NoChatSelected />
      )}
    </main>
  );
}
