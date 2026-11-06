import type { Metadata } from 'next';
import './globals.css';
import ApolloWrapper from '@/components/ApolloWrapper';

export const metadata: Metadata = {
  title: 'THMS – Home Project Manager',
  description: 'Manage your home contractor projects in one place',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ApolloWrapper>{children}</ApolloWrapper>
      </body>
    </html>
  );
}
