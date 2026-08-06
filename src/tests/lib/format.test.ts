import { describe, expect, it } from 'vitest';
import { formatTime, initialOf, shortUserId } from '@/lib/format';

describe('formatTime', () => {
  it('renders hours and minutes zero padded', () => {
    const morning = new Date(2026, 0, 2, 9, 5).getTime();
    expect(formatTime(morning)).toBe('09:05');
  });

  it('uses a 24 hour clock so afternoon times are unambiguous', () => {
    const evening = new Date(2026, 0, 2, 21, 30).getTime();
    expect(formatTime(evening)).toBe('21:30');
  });
});

describe('initialOf', () => {
  it('takes the first character and upper cases it', () => {
    expect(initialOf('roshan')).toBe('R');
  });

  it('leaves characters without a case, such as Thai, alone', () => {
    expect(initialOf('สมชาย')).toBe('ส');
  });

  it('returns an empty string rather than throwing on an empty name', () => {
    expect(initialOf('')).toBe('');
  });
});

describe('shortUserId', () => {
  it('truncates a LINE user id to something that fits the header', () => {
    expect(shortUserId('U1234567890abcdefghij')).toBe('U1234567890a...');
  });
});
