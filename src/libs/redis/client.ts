import { Redis } from '@upstash/redis';
import { RedisClientType, createClient } from 'redis';

import { redisConfigSchema } from '@/config/redis';

let redisClient: Redis | RedisClientType | null = null;

// Mock Redis client for development when Redis is disabled
const createMockRedisClient = () => {
  const mockClient = {
    isOpen: true,
    connect: async () => {},
    disconnect: async () => {},
    hSet: async () => 1,
    hGet: async () => null,
    hGetAll: async () => ({}),
    expire: async () => true,
    del: async () => 1,
    rPush: async () => 1,
    lRange: async () => [],
    xAdd: async () => 'mock-id',
    xRange: async () => [],
    scan: async () => ({ cursor: '0', keys: [] }),
  };
  return mockClient;
};

export const getRedisClient = async () => {
  if (redisClient) return redisClient;

  const config = redisConfigSchema.parse({
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    REDIS_MODE: process.env.REDIS_MODE,
    REDIS_URL: process.env.REDIS_URL,
  });

  if (config.REDIS_MODE === 'disabled') {
    console.log('⚠️ Redis is disabled - using mock client for development');
    redisClient = createMockRedisClient() as any;
    return redisClient;
  }

  if (config.REDIS_MODE === 'local') {
    // Use local Redis
    try {
      redisClient = createClient({
        url: config.REDIS_URL || 'redis://localhost:6379',
      });

      await (redisClient as RedisClientType).connect();
      console.log('✅ Connected to local Redis');
    } catch (error) {
      console.warn('⚠️ Failed to connect to local Redis, falling back to mock client:', error);
      redisClient = createMockRedisClient() as any;
    }
  } else {
    // Use Upstash Redis
    if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
      console.warn('⚠️ Upstash Redis credentials not provided, falling back to mock client');
      redisClient = createMockRedisClient() as any;
    } else {
      try {
        redisClient = new Redis({
          url: config.UPSTASH_REDIS_REST_URL,
          token: config.UPSTASH_REDIS_REST_TOKEN,
        });
        console.log('✅ Connected to Upstash Redis');
      } catch (error) {
        console.warn('⚠️ Failed to connect to Upstash Redis, falling back to mock client:', error);
        redisClient = createMockRedisClient() as any;
      }
    }
  }

  return redisClient;
};

export const getRedisService = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call getRedisClient() first.');
  }
  return redisClient;
};
