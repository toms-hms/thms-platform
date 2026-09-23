/**
 * The GraphQL client.
 *
 * Every call to the API goes through `gqlRequest`. Operations live in the
 * `queries.ts` and `mutations.ts` files colocated with the page or component
 * that uses them — see `.ai/recipes/web/api-client.md`.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const GRAPHQL_PATH = '/graphql';

/** An error returned by the API, carrying the server's stable error code. */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface GraphQLErrorShape {
  message: string;
  extensions?: { code?: string };
}

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: GraphQLErrorShape[];
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/** Clears the stored session and sends the browser to the login page. */
function endSession(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

/**
 * Runs one GraphQL operation and returns its data.
 *
 * Throws ApiError carrying `code` when the server reports an error; an expired
 * or rejected token ends the session and redirects to login, as the REST client
 * did on a 401.
 */
export async function gqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${GRAPHQL_PATH}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });

  let body: GraphQLResponse<T>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`HTTP ${res.status}`, 'INTERNAL_ERROR');
  }

  const error = body.errors?.[0];
  if (error) {
    const code = error.extensions?.code;
    if (code === 'UNAUTHORIZED' && typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
      endSession();
      throw new ApiError('Session expired', code);
    }
    throw new ApiError(error.message, code);
  }

  if (!body.data) throw new ApiError('Empty response from API', 'INTERNAL_ERROR');
  return body.data;
}
