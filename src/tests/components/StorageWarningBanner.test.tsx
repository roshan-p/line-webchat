import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StorageWarningBanner } from '@/components/StorageWarningBanner';
import { t } from '@/lib/i18n';

describe('StorageWarningBanner', () => {
  it('warns that chats are not persisted without blob storage', () => {
    render(<StorageWarningBanner />);

    expect(screen.getByText(t.storage.warning)).toBeInTheDocument();
  });
});
