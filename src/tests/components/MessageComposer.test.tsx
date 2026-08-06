import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageComposer } from '@/components/MessageComposer';
import { t } from '@/lib/i18n';

describe('MessageComposer', () => {
  it('does not send whitespace-only drafts', async () => {
    const onSend = vi.fn();
    render(<MessageComposer onSend={onSend} />);

    await userEvent.type(screen.getByPlaceholderText(t.chat.inputPlaceholder), '   ');
    await userEvent.click(screen.getByRole('button', { name: t.chat.send }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends trimmed text and clears the draft immediately', async () => {
    const onSend = vi.fn();
    render(<MessageComposer onSend={onSend} />);

    const input = screen.getByPlaceholderText(t.chat.inputPlaceholder);
    await userEvent.type(input, '  hello  ');
    await userEvent.click(screen.getByRole('button', { name: t.chat.send }));

    expect(onSend).toHaveBeenCalledWith('hello');
    expect(input).toHaveValue('');
  });

  it('sends on Enter and keeps Shift+Enter for a new line', async () => {
    const onSend = vi.fn();
    render(<MessageComposer onSend={onSend} />);

    const input = screen.getByPlaceholderText(t.chat.inputPlaceholder);
    await userEvent.type(input, 'hello{enter}');
    expect(onSend).toHaveBeenCalledWith('hello');

    onSend.mockClear();
    await userEvent.type(input, 'line two{shift>}{enter}');
    expect(onSend).not.toHaveBeenCalled();
  });
});
