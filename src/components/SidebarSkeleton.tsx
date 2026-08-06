import { SIDEBAR_SKELETON_ROWS } from '@/lib/constants';

export function SidebarSkeleton() {
  return (
    <div className="space-y-1 px-2 py-2">
      {Array.from({ length: SIDEBAR_SKELETON_ROWS }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-lg px-2 py-3"
        >
          <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-2 w-32 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
