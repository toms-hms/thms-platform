/**
 * Unit tests for the Apollo client's link chain.
 */
import { parse } from 'graphql';
import type { TypedDocumentNode } from '@apollo/client';
import { createApolloClient, errorCode } from '@/lib/apollo';

const HOMES: TypedDocumentNode<{ homes: { id: string }[] }> = parse('query Homes { homes { id } }');

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// jsdom refuses real navigation, so stand in for it and record where we were sent.
const originalLocation = window.location;
beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, href: originalLocation.href },
  });
});
afterAll(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

function jsonResponse(body: unknown, status = 200) {
  const text = JSON.stringify(body);
  return {
    ok: status < 400,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => text,
    json: async () => body,
  } as unknown as Response;
}

const HOMES_RESULT = { data: { homes: [{ __typename: 'HomeType', id: 'h1' }] } };

function queryHomes() {
  return createApolloClient().query({ query: HOMES, fetchPolicy: 'network-only' });
}

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

describe('createApolloClient', () => {
  it('posts the operation to /graphql', async () => {
    mockFetch.mockResolvedValue(jsonResponse(HOMES_RESULT));

    const { data } = await queryHomes();

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/graphql');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).operationName).toBe('Homes');
    expect(data?.homes).toEqual([{ __typename: 'HomeType', id: 'h1' }]);
  });

  it('sends the bearer token when one is stored', async () => {
    localStorage.setItem('accessToken', 'token-123');
    mockFetch.mockResolvedValue(jsonResponse(HOMES_RESULT));

    await queryHomes();

    expect(mockFetch.mock.calls[0][1].headers.authorization).toBe('Bearer token-123');
  });

  it('omits the auth header when there is no token', async () => {
    mockFetch.mockResolvedValue(jsonResponse(HOMES_RESULT));

    await queryHomes();

    expect(mockFetch.mock.calls[0][1].headers.authorization).toBeUndefined();
  });

  it('surfaces the server error code through errorCode()', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data: null, errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }] })
    );

    const error = await queryHomes().catch((e: unknown) => e);

    expect(errorCode(error)).toBe('FORBIDDEN');
    expect((error as Error).message).toContain('Forbidden');
  });

  it('ends the session when the token is rejected', async () => {
    localStorage.setItem('accessToken', 'expired');
    localStorage.setItem('refreshToken', 'expired-refresh');
    mockFetch.mockResolvedValue(
      jsonResponse({ data: null, errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHORIZED' } }] })
    );

    await queryHomes().catch(() => undefined);

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(window.location.href).toBe('/login');
  });
});

describe('errorCode', () => {
  it('is undefined for an error that did not come from the API', () => {
    expect(errorCode(new Error('network down'))).toBeUndefined();
  });
});
