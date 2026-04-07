import { google } from 'googleapis';
import { prisma } from '../config/prisma';
import { encrypt, decrypt } from '../utils/crypto.utils';
import { env } from '../config/env';
import { NotFoundError } from '../utils/errors';

function getGoogleOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

export async function getGmailAuthUrl(userId: string): Promise<string> {
  const oauth2Client = getGoogleOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: userId,
    prompt: 'consent',
  });
}

export async function handleGmailCallback(code: string, userId: string) {
  const oauth2Client = getGoogleOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  const accessTokenEnc = encrypt(tokens.access_token!);
  const refreshTokenEnc = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

  const integration = await prisma.integration.upsert({
    where: { userId_provider: { userId, provider: 'GOOGLE' } },
    create: {
      userId,
      type: 'EMAIL',
      provider: 'GOOGLE',
      accessTokenEnc,
      refreshTokenEnc: refreshTokenEnc || undefined,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      email: userInfo.email || undefined,
      scopes: tokens.scope?.split(' ') || [],
    },
    update: {
      accessTokenEnc,
      refreshTokenEnc: refreshTokenEnc || undefined,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      email: userInfo.email || undefined,
    },
  });

  return integration;
}

export async function getMicrosoftAuthUrl(userId: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: env.MICROSOFT_REDIRECT_URI || '',
    scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.Read offline_access',
    state: userId,
    response_mode: 'query',
  });

  return `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function handleMicrosoftCallback(code: string, userId: string) {
  const tokenUrl = `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.MICROSOFT_CLIENT_ID || '',
      client_secret: env.MICROSOFT_CLIENT_SECRET || '',
      redirect_uri: env.MICROSOFT_REDIRECT_URI || '',
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await response.json() as any;

  // Get user email
  const meResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const me = await meResponse.json() as any;

  const accessTokenEnc = encrypt(tokens.access_token);
  const refreshTokenEnc = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

  return prisma.integration.upsert({
    where: { userId_provider: { userId, provider: 'MICROSOFT' } },
    create: {
      userId,
      type: 'EMAIL',
      provider: 'MICROSOFT',
      accessTokenEnc,
      refreshTokenEnc: refreshTokenEnc || undefined,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      email: me.mail || me.userPrincipalName,
      scopes: tokens.scope?.split(' ') || [],
    },
    update: {
      accessTokenEnc,
      refreshTokenEnc: refreshTokenEnc || undefined,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      email: me.mail || me.userPrincipalName,
    },
  });
}

export async function listIntegrations(userId: string) {
  const integrations = await prisma.integration.findMany({ where: { userId } });
  return integrations.map((i) => ({
    id: i.id,
    type: i.type,
    provider: i.provider,
    email: i.email,
    status: 'CONNECTED',
    scopes: i.scopes,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));
}

export async function disconnectIntegration(integrationId: string, userId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, userId },
  });

  if (!integration) throw new NotFoundError('Integration');

  await prisma.integration.delete({ where: { id: integrationId } });
}

export async function sendViaGmail(data: {
  userId: string;
  integrationId: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  jobId?: string;
  contractorId?: string;
}) {
  const integration = await prisma.integration.findFirst({
    where: { id: data.integrationId, userId: data.userId, provider: 'GOOGLE' },
  });

  if (!integration) throw new NotFoundError('Integration');

  const oauth2Client = getGoogleOAuth2Client();
  const accessToken = decrypt(integration.accessTokenEnc);
  const refreshToken = integration.refreshTokenEnc ? decrypt(integration.refreshTokenEnc) : null;

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const message = [
    `To: ${data.to}`,
    `Subject: ${data.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    data.bodyHtml || data.bodyText,
  ].join('\r\n');

  const encoded = Buffer.from(message).toString('base64url');

  const sent = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });

  // Record the communication
  const comm = await prisma.communication.create({
    data: {
      jobId: data.jobId,
      contractorId: data.contractorId,
      channel: 'EMAIL',
      direction: 'SENT',
      subject: data.subject,
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml,
      externalMessageId: sent.data.id || undefined,
      externalThreadId: sent.data.threadId || undefined,
      sentAt: new Date(),
      needsReview: false,
    },
  });

  return {
    communicationId: comm.id,
    status: 'SENT',
    externalMessageId: sent.data.id,
    externalThreadId: sent.data.threadId,
    sentAt: comm.sentAt,
  };
}

export async function saveAIIntegration(userId: string, provider: string, apiKey: string) {
  const accessTokenEnc = encrypt(apiKey);

  return prisma.integration.upsert({
    where: { userId_provider: { userId, provider: 'OPENAI' } },
    create: {
      userId,
      type: 'AI',
      provider: 'OPENAI',
      accessTokenEnc,
      scopes: [],
    },
    update: { accessTokenEnc },
  });
}
