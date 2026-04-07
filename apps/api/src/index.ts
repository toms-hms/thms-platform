import './config/env'; // Validate env vars at startup
import app from './app';
import { prisma } from './config/prisma';
import { redisClient } from './config/redis';
import { env } from './config/env';

const PORT = env.PORT;

async function start() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    const server = app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        redisClient.disconnect();
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
