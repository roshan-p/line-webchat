import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageBubble } from '@/components/MessageBubble';
import { t } from '@/lib/i18n';
import type { ChatMessage } from '@/types/chat';

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    userId: 'U1',
    direction: 'outbound',
    messageType: 'text',
    text: 'hello',
    timestamp: new Date(2026, 0, 2, 9, 5).getTime(),
    ...overrides,
  };
}

const noop = () => {};

describe('MessageBubble', () => {
  it('shows the text and the time it was sent', () => {
    render(<MessageBubble message={message()} onRetry={noop} />);

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('09:05')).toBeInTheDocument();
  });

  it('points an image at the proxy rather than at LINE directly', () => {
    render(
      <MessageBubble
        message={message({ messageType: 'image', lineMessageId: 'm-line-1' })}
        onRetry={noop}
      />,
    );

    expect(screen.getByAltText(t.chat.imageAlt)).toHaveAttribute(
      'src',
      '/api/line-content/m-line-1',
    );
  });

  it('falls back to text when an image message lost its LINE id', () => {
    render(<MessageBubble message={message({ messageType: 'image' })} onRetry={noop} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('replaces the timestamp with a sending label while in flight', () => {
    render(<MessageBubble message={message({ deliveryStatus: 'sending' })} onRetry={noop} />);

    expect(screen.getByText(t.chat.sending)).toBeInTheDocument();
    expect(screen.queryByText('09:05')).not.toBeInTheDocument();
  });

  it('offers no retry until the send actually fails', () => {
    render(<MessageBubble message={message({ deliveryStatus: 'sending' })} onRetry={noop} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reports the failed message id when the retry button is pressed', async () => {
    const onRetry = vi.fn();
    render(<MessageBubble message={message({ deliveryStatus: 'failed' })} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: t.chat.resend }));

    expect(onRetry).toHaveBeenCalledWith('m1');
  });

  it('never offers a retry on a message that came from the user', () => {
    render(<MessageBubble message={message({ direction: 'inbound' })} onRetry={noop} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
