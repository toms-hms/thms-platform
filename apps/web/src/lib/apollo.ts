/**
 * The Apollo client.
 *
 * Every call to the API goes through this client, using the typed documents
 * codegen writes beside each `.graphql` file — see `.ai/recipes/web/api-client.md`.
 * The link chain attaches the bearer token and ends the session when the API
 * rejects it.
 */
import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { clearTokens, getAccessToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Returns the stable error code (`extensions.code`) the API attached to an error, if any. */
export function errorCode(error: unknown): string | undefined {
  if (!CombinedGraphQLErrors.is(error)) return undefined;
  const code = error.errors[0]?.extensions?.code;
  return typeof code === 'string' ? code : undefined;
}

/** Clears the stored session and sends the browser to the login page. */
function endSession(): void {
  clearTokens();
  window.location.href = '/login';
}

const authLink = new SetContextLink((prevContext) => {
  const token = getAccessToken();
  if (!token) return {};
  return { headers: { ...prevContext.headers, Authorization: `Bearer ${token}` } };
});

const sessionLink = new ErrorLink(({ error }) => {
  if (errorCode(error) === 'UNAUTHORIZED' && getAccessToken()) endSession();
});

const httpLink = new HttpLink({ uri: `${API_BASE}/graphql` });

/** Creates the client. One per browser session, held by `ApolloWrapper`. */
export function createApolloClient(): ApolloClient {
  return new ApolloClient({
    link: ApolloLink.from([sessionLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  });
}
