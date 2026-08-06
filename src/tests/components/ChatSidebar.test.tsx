import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatSidebar } from '@/components/ChatSidebar';
import { t } from '@/lib/i18n';
import { makeUser } from '@/tests/helpers';

describe('ChatSidebar', () => {
  it('shows a loading skeleton while users are being fetched', () => {
    render(
      <ChatSidebar
        users={[]}
        loading
        isLive={false}
        selectedUserId={null}
        onSelectUser={vi.fn()}
        hiddenOnMobile={false}
      />,
    );

    expect(screen.getByText(t.sidebar.loading)).toBeInTheDocument();
  });

  it('shows the empty state when nobody has written in', () => {
    render(
      <ChatSidebar
        users={[]}
        loading={false}
        isLive={false}
        selectedUserId={null}
        onSelectUser={vi.fn()}
        hiddenOnMobile={false}
      />,
    );

    expect(screen.getByText(t.sidebar.emptyTitle)).toBeInTheDocument();
  });

  it('shows realtime status when Ably is connected', () => {
    render(
      <ChatSidebar
        users={[makeUser()]}
        loading={false}
        isLive
        selectedUserId={null}
        onSelectUser={vi.fn()}
        hiddenOnMobile={false}
      />,
    );

    expect(screen.getByText(t.status.realtime)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('selects a conversation from the list', async () => {
    const onSelectUser = vi.fn();
    render(
      <ChatSidebar
        users={[makeUser()]}
        loading={false}
        isLive={false}
        selectedUserId={null}
        onSelectUser={onSelectUser}
        hiddenOnMobile={false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Alice/i }));

    expect(onSelectUser).toHaveBeenCalledWith('U1');
  });
});
