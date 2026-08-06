import { t } from '@/lib/i18n';

export function StorageWarningBanner() {
  return (
    <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
      {t.storage.warning}
    </div>
  );
}
