import { z } from 'zod';

export const redisConfigSchema = z.object({
  /**
   * Upstash Redis REST URL
   * @example "https://your-url.upstash.io"
   */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),

  /**
   * Upstash Redis REST Token
   */
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  /**
   * Redis connection mode
   * - local: Use local Redis (for development)
   * - remote: Use Upstash Redis (for production)
   * - disabled: Disable Redis (for development without Redis)
   * @default "remote"
   */
  REDIS_MODE: z.enum(['local', 'remote', 'disabled']).default('remote'),

  /**
   * Redis connection URL (for local mode)
   * @example "redis://localhost:6379"
   */
  REDIS_URL: z.string().optional(),
});

export type RedisConfig = z.infer<typeof redisConfigSchema>;
