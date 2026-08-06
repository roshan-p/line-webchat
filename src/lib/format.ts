import { LOCALE } from './constants';

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function initialOf(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function shortUserId(userId: string): string {
  return `${userId.slice(0, 12)}...`;
}
