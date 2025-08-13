import { getRedisClient } from '@/libs/redis/client';

import { RedisService } from './redisService';

// Dynamic imports to prevent client-side execution of Node.js modules
let Redis: any;
let RedisClientType: any;

let redisService: RedisService | null = null;

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
    xrange: async (
      key: string,
      start: string,
      end: string,
      count?: number,
    ): Promise<Record<string, Record<string, unknown>>> => {
      const result = await client.xRange(
        key,
        start || '-',
        end || '+',
        count ? { COUNT: count } : undefined,
      );
      return result.reduce((acc: Record<string, Record<string, unknown>>, item: any) => {
        acc[item.id] = item.message;
        return acc;
      }, {});
    },
    scan: async (cursor: string | number, options?: { match?: string; count?: number }) => {
      const result = await client.scan(String(cursor), {
        MATCH: options?.match,
        COUNT: options?.count,
      });
      return [result.cursor.toString(), result.keys] as [string, string[]];
    },
  };
};

export const getRedisService = async (): Promise<RedisService> => {
  if (redisService) return redisService;

  // Lazy load Redis modules only when needed
  if (!Redis) {
    try {
      const upstashRedis = await import('@upstash/redis');
      const redisModule = await import('redis');

      Redis = upstashRedis.Redis;
      RedisClientType = (redisModule as any).RedisClientType;
    } catch (error) {
      console.warn('⚠️ Redis modules not available (likely client-side):', error);
      // Provide a no-op RedisService adapter that satisfies the interface shape
      const noopAdapter: any = {
        hset: async () => 1,
        hget: async () => null,
        hgetall: async () => ({}),
        expire: async () => 1,
        del: async () => 0,
        rpush: async () => 0,
        lrange: async () => [],
        xadd: async () => '',
        xrange: async () => ({}),
        scan: async () => ['0', []],
      };
      return new RedisService(noopAdapter as any);
    }
  }

  const redisClient = await getRedisClient();

  // Create a Redis service adapter for local Redis client
  if ((redisClient as any).isOpen !== undefined) {
    const adapter = createLocalAdapter(redisClient) as any;
    redisService = new RedisService(adapter);
  } else {
    // Use Upstash Redis client directly
    redisService = new RedisService(redisClient as any);
  }

  return redisService;
};
