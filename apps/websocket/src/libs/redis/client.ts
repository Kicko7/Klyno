// Dynamic imports to prevent client-side execution of Node.js modules
let Redis: any;
let RedisClientType: any;
let createClient: any;

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
  // Lazy load Redis modules only when needed
  if (!Redis) {
    try {
      // Dynamic import to prevent client-side execution
      const upstashRedis = await import('@upstash/redis');
      const redisModule = await import('redis');

      Redis = upstashRedis.Redis;
      RedisClientType = (redisModule as any).RedisClientType;
      createClient = redisModule.createClient;
    } catch (error) {
      console.warn('⚠️ Redis modules not available (likely client-side):', error);
      // Return mock client for client-side
      return createMockRedisClient();
    }
  }

  let redisClient: any = null;

  const config = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    REDIS_MODE: process.env.REDIS_MODE,
    REDIS_URL: process.env.REDIS_URL,
  };

  if (config.REDIS_MODE === 'disabled') {
    console.log('⚠️ Redis is disabled - using mock client for development');
    redisClient = createMockRedisClient();
    return redisClient;
  }

  if (config.REDIS_MODE === 'local') {
    // Use local Redis
    try {
      redisClient = createClient({
        url: config.REDIS_URL || 'redis://localhost:6379',
      });

      await redisClient.connect();
      console.log('✅ Connected to local Redis');
    } catch (error) {
      console.warn('⚠️ Failed to connect to local Redis, falling back to mock client:', error);
      redisClient = createMockRedisClient();
    }
  } else {
    // Use Upstash Redis
    if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
      console.warn('⚠️ Upstash Redis credentials not provided, falling back to mock client');
      redisClient = createMockRedisClient();
    } else {
      try {
        redisClient = new Redis({
          url: config.UPSTASH_REDIS_REST_URL,
          token: config.UPSTASH_REDIS_REST_TOKEN,
        });
        console.log('✅ Connected to Upstash Redis');
      } catch (error) {
        console.warn('⚠️ Failed to connect to Upstash Redis, falling back to mock client:', error);
        redisClient = createMockRedisClient();
      }
    }
  }

  return redisClient;
};

export const getRedisService = () => {
  // This function should only be called after getRedisClient has been called
  // For client-side safety, return mock service if Redis is not available
  try {
    // Try to get the Redis client, but fall back to mock if it fails
    return getRedisClient();
  } catch (error) {
    console.warn('⚠️ Redis service not available, returning mock service:', error);
    return createMockRedisClient();
  }
};
