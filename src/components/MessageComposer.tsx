'use client';

import { useState } from 'react';
import { SendIcon } from './icons';
import { t } from '@/lib/i18n';

interface MessageComposerProps {
  sending: boolean;
  /** Resolves to false when the send failed, so the draft is not lost. */
  onSend: (text: string) => Promise<boolean>;
}

export function MessageComposer({ sending, onSend }: MessageComposerProps) {
  const [draft, setDraft] = useState('');

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (await onSend(text)) setDraft('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-line-border bg-line-panel px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:py-4">
      <div className="flex gap-2 md:gap-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.chat.inputPlaceholder}
          rows={1}
          // 16px on mobile keeps iOS Safari from zooming in on focus.
          className="min-w-0 flex-1 resize-none rounded-xl border border-line-border bg-line-bg px-4 py-3 text-base text-white placeholder-gray-500 outline-none focus:border-line-green md:text-sm"
        />
        <button
          onClick={submit}
          disabled={!draft.trim() || sending}
          aria-label={t.chat.send}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-line-green text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {sending ? <span className="text-xs">...</span> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}
