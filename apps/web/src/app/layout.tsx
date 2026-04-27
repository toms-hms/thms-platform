import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'THMS – Home Project Manager',
  description: 'Manage your home contractor projects in one place',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
