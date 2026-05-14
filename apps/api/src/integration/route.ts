import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticateJWT } from '@/middleware/auth.middleware';
import { IntegrationRequest, IntegrationsRequest } from './schema';
import { IntegrationManager } from './models/IntegrationManager';
import * as integrationService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req: IntegrationsRequest, res: Response, next: NextFunction) => {
  try {
    const list = await IntegrationManager.listForUser(req.user.userId);
    const data = list.map((i) => ({
      id: i.id, type: i.type, provider: i.provider, email: i.email,
      status: 'CONNECTED', scopes: i.scopes, createdAt: i.createdAt, updatedAt: i.updatedAt,
    }));
    res.json({ data });
  } catch (err) { next(err); }
});

router.get('/email/google/start', async (req: IntegrationsRequest, res: Response, next: NextFunction) => {
  try {
    const url = await integrationService.getGmailAuthUrl(req.user.userId);
    res.json({ data: { authorizationUrl: url } });
  } catch (err) { next(err); }
});

router.get('/email/google/callback', async (req: IntegrationsRequest, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await integrationService.handleGmailCallback(code, state);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/integrations?status=connected&provider=google`);
  } catch (err) { next(err); }
});

router.get('/email/microsoft/start', async (req: IntegrationsRequest, res: Response, next: NextFunction) => {
  try {
    const url = await integrationService.getMicrosoftAuthUrl(req.user.userId);
    res.json({ data: { authorizationUrl: url } });
  } catch (err) { next(err); }
});

router.get('/email/microsoft/callback', async (req: IntegrationsRequest, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await integrationService.handleMicrosoftCallback(code, state);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/integrations?status=connected&provider=microsoft`);
  } catch (err) { next(err); }
});

router.post('/ai', async (req: IntegrationsRequest, res: Response, next: NextFunction) => {
  try {
    const { provider, apiKey } = req.body;
    const integration = await integrationService.saveAIIntegration(req.user.userId, provider, apiKey);
    res.json({ data: { id: integration.id, type: integration.type, provider: integration.provider, status: 'CONNECTED' } });
  } catch (err) { next(err); }
});

router.delete('/:integrationId', async (req: IntegrationRequest, res: Response, next: NextFunction) => {
  try {
    await integrationService.disconnectIntegration(req.params.integrationId, req.user.userId);
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

export default router;
