import { Avatar } from './Avatar';
import { formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { ChatUser } from '@/types/chat';

interface ConversationItemProps {
  user: ChatUser;
  active: boolean;
  onSelect: (userId: string) => void;
}

function previewOf(user: ChatUser): string {
  if (user.lastMessage) return user.lastMessage;
  // A user can exist without a message when they only add the OA as a friend.
  return user.lastMessageAt > 0 ? t.sidebar.messagePending : t.sidebar.noMessageYet;
}

export function ConversationItem({ user, active, onSelect }: ConversationItemProps) {
  return (
    <button
      onClick={() => onSelect(user.userId)}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
        active ? 'bg-white/10' : ''
      }`}
    >
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">{user.displayName}</span>
          {user.lastMessageAt > 0 && (
            <span className="ml-1 shrink-0 text-xs text-gray-500">
              {formatTime(user.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="truncate text-xs text-gray-400">{previewOf(user)}</p>
          {user.unreadCount > 0 && (
            <span className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-line-green text-xs font-bold text-white">
              {user.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
