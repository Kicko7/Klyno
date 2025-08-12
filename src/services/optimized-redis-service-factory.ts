import { getRedisClient } from '@/libs/redis/client';

import { OptimizedRedisService } from './optimized-redis-service';

// Dynamic imports to prevent client-side execution of Node.js modules
let Redis: any;
let RedisClientType: any;

let optimizedRedisService: OptimizedRedisService | null = null;

// Create a minimal adapter for local Redis client
const createLocalAdapter = (client: any): Partial<any> => {
  return {
    hset: async (key: string, field: any, value?: any) => {
      if (typeof field === 'object') {
        return client.hSet(key, field);
      }
      return client.hSet(key, field, value);
    },
    hget: async <TData = string>(key: string, field: string): Promise<TData | null> => {
      const result = await client.hGet(key, field);
      return result as TData | null;
    },
    hgetall: async <TData extends Record<string, unknown> = Record<string, string>>(
      key: string,
    ): Promise<TData | null> => {
      const result = await client.hGetAll(key);
      return result as TData | null;
    },
    expire: async (key: string, seconds: number) => ((await client.expire(key, seconds)) ? 1 : 0),
    del: async (...keys: string[]) => client.del(keys),
    rpush: async <TData = string>(key: string, ...elements: TData[]): Promise<number> => {
      return client.rPush(key, elements.map(String));
    },
    lrange: async <TResult = string>(
      key: string,
      start: number,
      end: number,
    ): Promise<TResult[]> => {
      const result = await client.lRange(key, start, end);
      return result || [];
    },
    xadd: async (key: string, id: string, fields: any) => {
      const result = await client.xAdd(key, '*', fields);
      return result || '';
    },
    xrange: async (key: string, start: string, end: string) => {
      const result = await client.xRange(key, start, end);
      return result || [];
    },
    scan: async (cursor: string, options?: any) => {
      const result = await client.scan(cursor, options);
      return result || { cursor: '0', keys: [] };
    },
    ping: async () => {
      try {
        await client.ping();
        return 'PONG';
      } catch (error) {
        throw error;
      }
    },
    pipeline: () => {
      return {
        setex: (key: string, ttl: number, value: string) => {
          return { setex: [key, ttl, value] };
        },
        set: (key: string, value: string) => {
          return { set: [key, value] };
        },
        del: (key: string) => {
          return { del: [key] };
        },
        expire: (key: string, ttl: number) => {
          return { expire: [key, ttl] };
        },
        hset: (key: string, field: string, value: string) => {
          return { hset: [key, field, value] };
        },
        exec: async () => {
          // For mock client, just return success
          return [true, true, true];
        },
      };
    },
    memory: async (command: string) => {
      // Mock memory command
      return 'OK';
    },
  };
};

export const getOptimizedRedisService = async (): Promise<OptimizedRedisService> => {
  if (optimizedRedisService) return optimizedRedisService;

  // Lazy load Redis modules only when needed
  if (!Redis) {
    try {
      const upstashRedis = await import('@upstash/redis');
      const redisModule = await import('redis');

      Redis = upstashRedis.Redis;
      RedisClientType = (redisModule as any).RedisClientType;
    } catch (error) {
      console.warn('⚠️ Redis modules not available (likely client-side):', error);
      // Continue: getRedisClient will return a mock client; we still wrap it in OptimizedRedisService
    }
  }

  const redisClient = await getRedisClient();

  // Create a Redis service adapter for local Redis client
  if ((redisClient as any).isOpen !== undefined) {
    const adapter = createLocalAdapter(redisClient) as any;
    optimizedRedisService = new OptimizedRedisService(adapter);
  } else {
    // Use Upstash Redis client directly
    optimizedRedisService = new OptimizedRedisService(redisClient as any);
  }

  return optimizedRedisService;
};
