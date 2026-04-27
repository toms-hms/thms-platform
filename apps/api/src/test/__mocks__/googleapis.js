const mockGmail = { users: { messages: { send: jest.fn().mockResolvedValue({ data: { id: 'msg_1', threadId: 'thread_1' } }) } } };
const mockOauth2 = { userinfo: { get: jest.fn().mockResolvedValue({ data: { email: 'test@example.com' } }) } };

const google = {
  auth: { OAuth2: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn().mockReturnValue('https://auth.example.com'),
    getToken: jest.fn().mockResolvedValue({ tokens: { access_token: 'token', refresh_token: 'refresh', expiry_date: Date.now() + 3600000, scope: 'email' } }),
    setCredentials: jest.fn(),
  })) },
  gmail: jest.fn().mockReturnValue(mockGmail),
  oauth2: jest.fn().mockReturnValue(mockOauth2),
};

module.exports = { google };
