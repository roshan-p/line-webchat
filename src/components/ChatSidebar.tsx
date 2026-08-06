import { ConversationItem } from './ConversationItem';
import { SidebarSkeleton } from './SidebarSkeleton';
import { LoadingState } from './Spinner';
import { LineLogoIcon } from './icons';
import { t } from '@/lib/i18n';
import type { ChatUser } from '@/types/chat';

interface ChatSidebarProps {
  users: ChatUser[];
  loading: boolean;
  isLive: boolean;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  /** Mobile shows one pane at a time, so the list hides while a chat is open. */
  hiddenOnMobile: boolean;
}

function SidebarHeader({ isLive }: { isLive: boolean }) {
  return (
    <div className="border-b border-line-border px-4 py-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-line-green text-white">
          <LineLogoIcon />
        </div>
        <div>
          <h1 className="text-sm font-semibold">{t.app.title}</h1>
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isLive ? 'bg-line-green' : 'bg-gray-500'
              }`}
            />
            {isLive ? t.status.realtime : t.status.polling}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyConversationList() {
  return (
    <div className="px-4 py-8 text-center text-sm text-gray-500">
      <p>{t.sidebar.emptyTitle}</p>
      <p className="mt-1 text-xs">{t.sidebar.emptyHint}</p>
    </div>
  );
}

export function ChatSidebar({
  users,
  loading,
  isLive,
  selectedUserId,
  onSelectUser,
  hiddenOnMobile,
}: ChatSidebarProps) {
  return (
    <aside
      className={`${
        hiddenOnMobile ? 'hidden md:flex' : 'flex'
      } w-full shrink-0 flex-col border-r border-line-border bg-line-panel md:w-80`}
    >
      <SidebarHeader isLive={isLive} />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col">
            <LoadingState label={t.sidebar.loading} />
            <SidebarSkeleton />
          </div>
        ) : users.length === 0 ? (
          <EmptyConversationList />
        ) : (
          users.map((user) => (
            <ConversationItem
              key={user.userId}
              user={user}
              active={user.userId === selectedUserId}
              onSelect={onSelectUser}
            />
          ))
        )}
      </div>
    </aside>
  );
}
