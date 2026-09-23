/**
 * Authentication operations.
 *
 * These live in `lib/` rather than beside a page because the login page, the
 * register page and the navbar all need them.
 */
import { gqlRequest } from '@/lib/graphql';
import type { AuthTokens, UserDto } from '@/types/api';

const AUTH_FIELDS = `
  user { id email firstName lastName role createdAt }
  tokens { accessToken refreshToken }
`;

interface AuthResult {
  user: UserDto;
  tokens: AuthTokens;
}

/** Registers a new account and returns the user with a fresh token pair. */
export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ data: AuthResult }> {
  const data = await gqlRequest<{ register: AuthResult }>(
    `mutation Register($email: String!, $password: String!, $firstName: String!, $lastName: String!) {
       register(email: $email, password: $password, firstName: $firstName, lastName: $lastName) { ${AUTH_FIELDS} }
     }`,
    input
  );
  return { data: data.register };
}

/** Signs in and returns the user with a fresh token pair. */
export async function login(input: { email: string; password: string }): Promise<{ data: AuthResult }> {
  const data = await gqlRequest<{ login: AuthResult }>(
    `mutation Login($email: String!, $password: String!) {
       login(email: $email, password: $password) { ${AUTH_FIELDS} }
     }`,
    input
  );
  return { data: data.login };
}

/** Revokes the current refresh token. */
export async function logout(): Promise<{ data: { success: boolean } }> {
  const data = await gqlRequest<{ logout: { success: boolean } }>(`mutation { logout { success } }`);
  return { data: data.logout };
}

/** Returns the authenticated user's own record. */
export async function me(): Promise<{ data: UserDto }> {
  const data = await gqlRequest<{ me: UserDto }>(
    `query { me { id email firstName lastName role createdAt } }`
  );
  return { data: data.me };
}
