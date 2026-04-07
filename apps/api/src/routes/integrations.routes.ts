import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import * as integrationsService from '../services/integrations.service';

const router = Router();

router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const integrations = await integrationsService.listIntegrations(
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: integrations });
  } catch (err) {
    next(err);
  }
});

router.get('/email/google/start', async (req, res, next) => {
  try {
    const url = await integrationsService.getGmailAuthUrl(
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: { authorizationUrl: url } });
  } catch (err) {
    next(err);
  }
});

router.get('/email/google/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await integrationsService.handleGmailCallback(code, state);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/integrations?status=connected&provider=google`);
  } catch (err) {
    next(err);
  }
});

router.get('/email/microsoft/start', async (req, res, next) => {
  try {
    const url = await integrationsService.getMicrosoftAuthUrl(
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: { authorizationUrl: url } });
  } catch (err) {
    next(err);
  }
});

router.get('/email/microsoft/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await integrationsService.handleMicrosoftCallback(code, state);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/integrations?status=connected&provider=microsoft`);
  } catch (err) {
    next(err);
  }
});

router.post('/ai', async (req, res, next) => {
  try {
    const { provider, apiKey } = req.body;
    const integration = await integrationsService.saveAIIntegration(
      (req as unknown as AuthenticatedRequest).user.userId,
      provider,
      apiKey
    );
    res.json({ data: { id: integration.id, type: integration.type, provider: integration.provider, status: 'CONNECTED' } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:integrationId', async (req, res, next) => {
  try {
    await integrationsService.disconnectIntegration(
      req.params.integrationId,
      (req as unknown as AuthenticatedRequest).user.userId
    );
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
