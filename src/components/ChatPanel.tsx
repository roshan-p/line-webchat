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
  unreadOnOpen: number;
  onBack: () => void;
  onSend: (text: string) => void;
  onRetry: (messageId: string) => void;
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
  unreadOnOpen,
  onBack,
  onSend,
  onRetry,
  hiddenOnMobile,
}: ChatPanelProps) {
  return (
    <main
      className={`${hiddenOnMobile ? 'hidden md:flex' : 'flex'} min-w-0 flex-1 flex-col`}
    >
      {user ? (
        <>
          <ChatHeader user={user} onBack={onBack} />
          <MessageList
            key={user.userId}
            messages={messages}
            loading={messagesLoading}
            unreadOnOpen={unreadOnOpen}
            onRetry={onRetry}
          />
          <MessageComposer onSend={onSend} />
        </>
      ) : (
        <NoChatSelected />
      )}
    </main>
  );
}
