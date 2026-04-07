import Redis from 'ioredis';
import { env } from './env';

export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Redis connected'));

// Separate connection for BullMQ (BullMQ manages its own lifecycle)
export const bullConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
