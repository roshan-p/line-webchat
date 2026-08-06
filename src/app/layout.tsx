import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LINE Webchat Admin',
  description: 'Webchat dashboard for LINE Official Account',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
