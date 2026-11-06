'use client';
import { useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { createApolloClient } from '@/lib/apollo';

/** Provides the Apollo client to every page. The client is created once per browser session. */
export default function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const [client] = useState(createApolloClient);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
