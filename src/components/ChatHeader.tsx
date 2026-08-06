import { Avatar } from './Avatar';
import { BackIcon } from './icons';
import { shortUserId } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { ChatUser } from '@/types/chat';

interface ChatHeaderProps {
  user: ChatUser;
  onBack: () => void;
}

export function ChatHeader({ user, onBack }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-line-border bg-line-panel px-4 py-3 md:px-6">
      <button
        onClick={onBack}
        aria-label={t.chat.back}
        className="-ml-1 shrink-0 rounded-lg p-1 text-gray-300 hover:bg-white/10 md:hidden"
      >
        <BackIcon />
      </button>
      <Avatar user={user} />
      <div className="min-w-0">
        <h2 className="truncate font-semibold">{user.displayName}</h2>
        <p className="truncate text-xs text-gray-400">ID: {shortUserId(user.userId)}</p>
      </div>
    </header>
  );
}
