import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingState, Spinner } from '@/components/Spinner';

describe('Spinner', () => {
  it('renders an accessible loading indicator', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows the provided label with the spinner', () => {
    render(<LoadingState label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
