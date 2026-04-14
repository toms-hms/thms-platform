import './config/env';
import app from './app';
import { queryClient } from './db';
import { redisClient } from './config/redis';
import { env } from './config/env';

const PORT = env.PORT;

async function start() {
  try {
    const server = app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await queryClient.end();
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
