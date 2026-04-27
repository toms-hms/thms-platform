import { google } from 'googleapis';
import { encrypt, decrypt } from '../utils/crypto.utils';
import { env } from '../config/env';
import { NotFoundError } from '../utils/errors';
import { IntegrationManager } from './models/IntegrationManager';
import { CommunicationManager } from '../communication/models/CommunicationManager';
import { createId } from '@paralleldrive/cuid2';

function getGoogleOAuth2Client() {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
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

  return IntegrationManager.upsertByProvider(userId, 'GOOGLE', {
    id: createId(),
    type: 'EMAIL',
    accessTokenEnc: encrypt(tokens.access_token!),
    refreshTokenEnc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    email: userInfo.email ?? null,
    scopes: tokens.scope?.split(' ') ?? [],
    updatedAt: new Date(),
  });
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
      code, client_id: env.MICROSOFT_CLIENT_ID || '',
      client_secret: env.MICROSOFT_CLIENT_SECRET || '',
      redirect_uri: env.MICROSOFT_REDIRECT_URI || '',
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await response.json() as any;
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const me = await meRes.json() as any;

  return IntegrationManager.upsertByProvider(userId, 'MICROSOFT', {
    id: createId(),
    type: 'EMAIL',
    accessTokenEnc: encrypt(tokens.access_token),
    refreshTokenEnc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    email: me.mail ?? me.userPrincipalName ?? null,
    scopes: tokens.scope?.split(' ') ?? [],
    updatedAt: new Date(),
  });
}

export async function listIntegrations(userId: string) {
  const list = await IntegrationManager.listForUser(userId);
  return list.map((i) => ({ id: i.id, type: i.type, provider: i.provider, email: i.email, status: 'CONNECTED', scopes: i.scopes, createdAt: i.createdAt, updatedAt: i.updatedAt }));
}

export async function disconnectIntegration(integrationId: string, userId: string) {
  const integration = await IntegrationManager.findById(integrationId);
  if (!integration || integration.userId !== userId) throw new NotFoundError('Integration');
  await IntegrationManager.delete(integrationId);
}

export async function sendViaGmail(data: { userId: string; integrationId: string; to: string; subject: string; bodyText: string; bodyHtml?: string; jobId?: string; contractorId?: string }) {
  const integration = await IntegrationManager.findById(data.integrationId);
  if (!integration || integration.userId !== data.userId || integration.provider !== 'GOOGLE') throw new NotFoundError('Integration');

  const oauth2Client = getGoogleOAuth2Client();
  oauth2Client.setCredentials({
    access_token: decrypt(integration.accessTokenEnc),
    refresh_token: integration.refreshTokenEnc ? decrypt(integration.refreshTokenEnc) : null,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const message = [`To: ${data.to}`, `Subject: ${data.subject}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', '', data.bodyHtml || data.bodyText].join('\r\n');
  const sent = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: Buffer.from(message).toString('base64url') } });

  const comm = await CommunicationManager.create({
    id: createId(),
    jobId: data.jobId ?? null,
    contractorId: data.contractorId ?? null,
    channel: 'EMAIL',
    direction: 'SENT',
    subject: data.subject,
    bodyText: data.bodyText,
    bodyHtml: data.bodyHtml ?? null,
    externalMessageId: sent.data.id ?? null,
    externalThreadId: sent.data.threadId ?? null,
    sentAt: new Date(),
    receivedAt: null,
    parsedSummary: null,
    needsReview: false,
    updatedAt: new Date(),
  });

  return { communicationId: comm.id, status: 'SENT', externalMessageId: sent.data.id, externalThreadId: sent.data.threadId, sentAt: comm.sentAt };
}

export async function saveAIIntegration(userId: string, provider: string, apiKey: string) {
  return IntegrationManager.upsertByProvider(userId, 'OPENAI', {
    id: createId(),
    type: 'AI',
    accessTokenEnc: encrypt(apiKey),
    refreshTokenEnc: null,
    tokenExpiresAt: null,
    email: null,
    scopes: [],
    updatedAt: new Date(),
  });
}
