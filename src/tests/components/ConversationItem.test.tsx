import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConversationItem } from '@/components/ConversationItem';
import { t } from '@/lib/i18n';
import { makeUser } from '@/tests/helpers';

describe('ConversationItem', () => {
  it('shows the last message preview and unread badge', () => {
    render(
      <ConversationItem
        user={makeUser({ lastMessage: 'hello', unreadCount: 3 })}
        active={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows a placeholder when the user has never sent a message', () => {
    render(
      <ConversationItem
        user={makeUser({ lastMessage: undefined, lastMessageAt: 0 })}
        active={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(t.sidebar.noMessageYet)).toBeInTheDocument();
  });

  it('shows a pending marker when the user exists but the message has not arrived yet', () => {
    render(
      <ConversationItem
        user={makeUser({ lastMessage: undefined, lastMessageAt: 1 })}
        active={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(t.sidebar.messagePending)).toBeInTheDocument();
  });

  it('calls onSelect with the user id', async () => {
    const onSelect = vi.fn();
    render(<ConversationItem user={makeUser()} active={false} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalledWith('U1');
  });
});
