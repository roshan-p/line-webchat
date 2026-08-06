import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatHeader } from '@/components/ChatHeader';
import { t } from '@/lib/i18n';
import { makeUser } from '@/tests/helpers';

describe('ChatHeader', () => {
  it('shows the user name and a shortened id', () => {
    render(<ChatHeader user={makeUser({ userId: 'U1234567890abcdefghij' })} onBack={vi.fn()} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('ID: U1234567890a...')).toBeInTheDocument();
  });

  it('calls onBack when the mobile back button is pressed', async () => {
    const onBack = vi.fn();
    render(<ChatHeader user={makeUser()} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: t.chat.back }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
