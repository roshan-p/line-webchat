'use client';

import { ChatPanel } from '@/components/ChatPanel';
import { ChatSidebar } from '@/components/ChatSidebar';
import { StorageWarningBanner } from '@/components/StorageWarningBanner';
import { useChat } from '@/hooks/useChat';
import { useServerConfig } from '@/hooks/useServerConfig';

export default function WebchatPage() {
  const { persistent, realtime } = useServerConfig();
  const chat = useChat(realtime);
  const chatOpen = Boolean(chat.selectedUserId);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {!persistent && <StorageWarningBanner />}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ChatSidebar
          users={chat.users}
          loading={chat.usersLoading}
          isLive={chat.isLive}
          selectedUserId={chat.selectedUserId}
          onSelectUser={chat.selectUser}
          hiddenOnMobile={chatOpen}
        />
        <ChatPanel
          user={chat.selectedUser}
          messages={chat.messages}
          messagesLoading={chat.messagesLoading}
          sending={chat.sending}
          error={chat.error}
          onBack={() => chat.selectUser(null)}
          onSend={chat.send}
          hiddenOnMobile={!chatOpen}
        />
      </div>
    </div>
  );
}
