import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import * as integrationService from './service';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const list = await integrationService.listIntegrations((req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: list });
  } catch (err) { next(err); }
});

router.get('/email/google/start', async (req, res, next) => {
  try {
    const url = await integrationService.getGmailAuthUrl((req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: { authorizationUrl: url } });
  } catch (err) { next(err); }
});

router.get('/email/google/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await integrationService.handleGmailCallback(code, state);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/integrations?status=connected&provider=google`);
  } catch (err) { next(err); }
});

router.get('/email/microsoft/start', async (req, res, next) => {
  try {
    const url = await integrationService.getMicrosoftAuthUrl((req as unknown as AuthenticatedRequest).user.userId);
    res.json({ data: { authorizationUrl: url } });
  } catch (err) { next(err); }
});

router.get('/email/microsoft/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await integrationService.handleMicrosoftCallback(code, state);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/integrations?status=connected&provider=microsoft`);
  } catch (err) { next(err); }
});

router.post('/ai', async (req, res, next) => {
  try {
    const { provider, apiKey } = req.body;
    const integration = await integrationService.saveAIIntegration(
      (req as unknown as AuthenticatedRequest).user.userId, provider, apiKey
    );
    res.json({ data: { id: integration.id, type: integration.type, provider: integration.provider, status: 'CONNECTED' } });
  } catch (err) { next(err); }
});

router.delete('/:integrationId', async (req, res, next) => {
  try {
    await integrationService.disconnectIntegration(
      req.params.integrationId, (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

export default router;
