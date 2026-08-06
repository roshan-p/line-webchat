import { initialOf } from '@/lib/format';
import type { ChatUser } from '@/types/chat';

export function Avatar({ user }: { user: ChatUser }) {
  if (user.pictureUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.pictureUrl}
        alt={user.displayName}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-line-green text-sm font-bold text-white">
      {initialOf(user.displayName)}
    </div>
  );
}
