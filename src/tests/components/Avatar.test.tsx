import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from '@/components/Avatar';
import { makeUser } from '@/tests/helpers';

describe('Avatar', () => {
  it('shows the profile picture when LINE provides one', () => {
    render(
      <Avatar
        user={makeUser({
          displayName: 'Alice',
          pictureUrl: 'https://example.com/a.jpg',
        })}
      />,
    );

    expect(screen.getByAltText('Alice')).toHaveAttribute('src', 'https://example.com/a.jpg');
  });

  it('falls back to the first letter of the display name', () => {
    render(<Avatar user={makeUser({ displayName: 'bob' })} />);

    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
