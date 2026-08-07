import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageList } from '@/components/MessageList';
import { t } from '@/lib/i18n';
import { makeMessage } from '@/tests/helpers';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('MessageList', () => {
  it('shows a loading state', () => {
    render(<MessageList messages={[]} loading unreadOnOpen={0} onRetry={vi.fn()} />);

    expect(screen.getByText(t.chat.loadingMessages)).toBeInTheDocument();
  });

  it('shows an empty state when there are no messages', () => {
    render(<MessageList messages={[]} loading={false} unreadOnOpen={0} onRetry={vi.fn()} />);

    expect(screen.getByText(t.chat.emptyConversation)).toBeInTheDocument();
  });

  it('renders every message bubble', () => {
    render(
      <MessageList
        messages={[makeMessage({ id: 'm1', text: 'one' }), makeMessage({ id: 'm2', text: 'two' })]}
        loading={false}
        unreadOnOpen={0}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });

  it('scrolls to the bottom when messages change', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    const { rerender } = render(
      <MessageList
        messages={[makeMessage()]}
        loading={false}
        unreadOnOpen={0}
        onRetry={vi.fn()}
      />,
    );

    rerender(
      <MessageList
        messages={[makeMessage(), makeMessage({ id: 'm2', text: 'new' })]}
        loading={false}
        unreadOnOpen={0}
        onRetry={vi.fn()}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('scrolls to the first unread message when a chat is opened', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <MessageList
        messages={[
          makeMessage({ id: 'm1', direction: 'inbound', text: 'read' }),
          makeMessage({ id: 'm2', direction: 'outbound', text: 'reply' }),
          makeMessage({ id: 'm3', direction: 'inbound', text: 'unread' }),
        ]}
        loading={false}
        unreadOnOpen={1}
        onRetry={vi.fn()}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
  });
});
