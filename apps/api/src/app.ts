import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';

import authRouter from './auth/route';
import homeRouter from './home/route';
import contractorRouter from './contractor/route';
import { jobCollectionRouter, jobRouter } from './job/route';
import quoteRouter from './quote/route';
import communicationRouter from './communication/route';
import integrationRouter from './integration/route';
import vendorRouter from './vendor/route';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.use('/api', globalLimiter);
app.use('/api/v1/auth', authLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/homes', homeRouter);
app.use('/api/v1/homes/:homeId/jobs', jobCollectionRouter);
app.use('/api/v1/contractors', contractorRouter);
app.use('/api/v1/jobs', jobRouter);
app.use('/api/v1/quotes', quoteRouter);
app.use('/api/v1/communications', communicationRouter);
app.use('/api/v1/integrations', integrationRouter);
app.use('/api/v1/vendors', vendorRouter);

app.use(errorHandler);

export default app;
