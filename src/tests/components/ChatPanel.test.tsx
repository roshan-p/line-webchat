import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatPanel } from '@/components/ChatPanel';
import { t } from '@/lib/i18n';
import { makeMessage, makeUser } from '@/tests/helpers';

describe('ChatPanel', () => {
  it('shows the empty state when no chat is selected', () => {
    render(
      <ChatPanel
        user={null}
        messages={[]}
        messagesLoading={false}
        onBack={vi.fn()}
        onSend={vi.fn()}
        onRetry={vi.fn()}
        hiddenOnMobile={false}
      />,
    );

    expect(screen.getByText(t.chat.selectUser)).toBeInTheDocument();
  });

  it('renders the thread and composer for the selected user', async () => {
    const onSend = vi.fn();
    render(
      <ChatPanel
        user={makeUser()}
        messages={[makeMessage({ text: 'hello' })]}
        messagesLoading={false}
        onBack={vi.fn()}
        onSend={onSend}
        onRetry={vi.fn()}
        hiddenOnMobile={false}
      />,
    );

    expect(screen.getByText('hello')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(t.chat.inputPlaceholder), 'reply');
    await userEvent.click(screen.getByRole('button', { name: t.chat.send }));

    expect(onSend).toHaveBeenCalledWith('reply');
  });

  it('goes back to the conversation list from the header', async () => {
    const onBack = vi.fn();
    render(
      <ChatPanel
        user={makeUser()}
        messages={[]}
        messagesLoading={false}
        onBack={onBack}
        onSend={vi.fn()}
        onRetry={vi.fn()}
        hiddenOnMobile={false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: t.chat.back }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
