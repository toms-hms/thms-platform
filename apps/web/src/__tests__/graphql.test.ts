/**
 * Unit tests for the GraphQL client.
 */
import { ApiError, gqlRequest } from '@/lib/graphql';

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
  return { status, json: async () => body } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

describe('ApiError', () => {
  it('stores the message and error code', () => {
    const err = new ApiError('Not found', 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('ApiError');
  });

  it('is an instance of Error', () => {
    expect(new ApiError('Test') instanceof Error).toBe(true);
  });
});

describe('gqlRequest', () => {
  it('posts the query and variables to /graphql', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { homes: [] } }));

    await gqlRequest('query { homes { id } }', { homeId: 'h1' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/graphql');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      query: 'query { homes { id } }',
      variables: { homeId: 'h1' },
    });
  });

  it('returns the data payload', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { homes: [{ id: 'h1' }] } }));

    const data = await gqlRequest<{ homes: { id: string }[] }>('query { homes { id } }');

    expect(data.homes).toEqual([{ id: 'h1' }]);
  });

  it('sends the bearer token when one is stored', async () => {
    localStorage.setItem('accessToken', 'token-123');
    mockFetch.mockResolvedValue(jsonResponse({ data: { me: { id: 'u1' } } }));

    await gqlRequest('query { me { id } }');

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-123');
  });

  it('omits the auth header when there is no token', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { me: null } }));

    await gqlRequest('query { me { id } }');

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('throws ApiError carrying the server error code', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }] })
    );

    await expect(gqlRequest('query { homes { id } }')).rejects.toMatchObject({
      message: 'Forbidden',
      code: 'FORBIDDEN',
    });
  });

  it('clears the session when the token is rejected', async () => {
    localStorage.setItem('accessToken', 'expired');
    localStorage.setItem('refreshToken', 'expired-refresh');
    mockFetch.mockResolvedValue(
      jsonResponse({ errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHORIZED' } }] })
    );

    await expect(gqlRequest('query { me { id } }')).rejects.toThrow('Session expired');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('throws when the response body is not JSON', async () => {
    mockFetch.mockResolvedValue({
      status: 502,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);

    await expect(gqlRequest('query { homes { id } }')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
