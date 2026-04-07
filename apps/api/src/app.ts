import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import homesRoutes from './routes/homes.routes';
import contractorsRoutes from './routes/contractors.routes';
import jobsRoutes from './routes/jobs.routes';
import jobDetailRoutes from './routes/job-detail.routes';
import quotesRoutes from './routes/quotes.routes';
import communicationsRoutes from './routes/communications.routes';
import integrationsRoutes from './routes/integrations.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);
app.use('/api/v1/auth', authLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/homes', homesRoutes);
app.use('/api/v1/homes/:homeId/jobs', jobsRoutes);
app.use('/api/v1/contractors', contractorsRoutes);
app.use('/api/v1/jobs', jobDetailRoutes);
app.use('/api/v1/quotes', quotesRoutes);
app.use('/api/v1/communications', communicationsRoutes);
app.use('/api/v1/integrations', integrationsRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
