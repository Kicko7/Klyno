/* eslint-disable sort-keys-fix/sort-keys-fix */
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

import { isServerMode } from '@/const/version';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      ACCESS_CODE?: string;
    }
  }
}
const isInVercel = process.env.VERCEL === '1';

const vercelUrl = `https://${process.env.VERCEL_URL}`;

const APP_URL = process.env.APP_URL ? process.env.APP_URL : isInVercel ? vercelUrl : undefined;

// only throw error in server mode and server side
if (typeof window === 'undefined' && isServerMode && !APP_URL) {
  throw new Error('`APP_URL` is required in server mode');
}

const ASSISTANT_INDEX_URL = 'https://registry.npmmirror.com/@lobehub/agents-index/v1/files/public';

const PLUGINS_INDEX_URL = 'https://chat-plugins.lobehub.com';

export const getAppConfig = () => {
  const ACCESS_CODES = process.env.ACCESS_CODE?.split(',').filter(Boolean) || [];

  return createEnv({
    client: {
      NEXT_PUBLIC_BASE_PATH: z.string(),
      NEXT_PUBLIC_ENABLE_SENTRY: z.boolean(),
      // Supabase configuration
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
      // Stripe configuration
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
      // Klyno configuration
      NEXT_PUBLIC_KLYNO_BRANDING: z.boolean().default(true),
      NEXT_PUBLIC_BYOK_ENABLED: z.boolean().default(true),
    },
    server: {
      ACCESS_CODES: z.any(z.string()).optional(),

      AGENTS_INDEX_URL: z.string().url(),

      DEFAULT_AGENT_CONFIG: z.string(),
      SYSTEM_AGENT: z.string().optional(),

      PLUGINS_INDEX_URL: z.string().url(),
      PLUGIN_SETTINGS: z.string().optional(),

      APP_URL: z.string().optional(),
      VERCEL_EDGE_CONFIG: z.string().optional(),
      MIDDLEWARE_REWRITE_THROUGH_LOCAL: z.boolean().optional(),
      ENABLE_AUTH_PROTECTION: z.boolean().optional(),

      CDN_USE_GLOBAL: z.boolean().optional(),
      CUSTOM_FONT_FAMILY: z.string().optional(),
      CUSTOM_FONT_URL: z.string().optional(),

      SSRF_ALLOW_PRIVATE_IP_ADDRESS: z.boolean().optional(),
      SSRF_ALLOW_IP_ADDRESS_LIST: z.string().optional(),

      // Supabase server configuration
      SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
      
      // Stripe server configuration
      STRIPE_SECRET_KEY: z.string().optional(),
      STRIPE_WEBHOOK_SECRET: z.string().optional(),
      
      // Klyno API keys for default service
      KLYNO_OPENAI_API_KEY: z.string().optional(),
      KLYNO_ANTHROPIC_API_KEY: z.string().optional(),
      KLYNO_GOOGLE_API_KEY: z.string().optional(),
    },
    runtimeEnv: {
      NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',

      // Sentry
      NEXT_PUBLIC_ENABLE_SENTRY: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

      ACCESS_CODES: ACCESS_CODES as any,

      AGENTS_INDEX_URL: !!process.env.AGENTS_INDEX_URL
        ? process.env.AGENTS_INDEX_URL
        : ASSISTANT_INDEX_URL,

      DEFAULT_AGENT_CONFIG: process.env.DEFAULT_AGENT_CONFIG || '',
      SYSTEM_AGENT: process.env.SYSTEM_AGENT,

      PLUGINS_INDEX_URL: !!process.env.PLUGINS_INDEX_URL
        ? process.env.PLUGINS_INDEX_URL
        : PLUGINS_INDEX_URL,

      PLUGIN_SETTINGS: process.env.PLUGIN_SETTINGS,

      VERCEL_EDGE_CONFIG: process.env.VERCEL_EDGE_CONFIG,

      APP_URL,
      MIDDLEWARE_REWRITE_THROUGH_LOCAL: process.env.MIDDLEWARE_REWRITE_THROUGH_LOCAL === '1',
      ENABLE_AUTH_PROTECTION: process.env.ENABLE_AUTH_PROTECTION === '1',

      CUSTOM_FONT_FAMILY: process.env.CUSTOM_FONT_FAMILY,
      CUSTOM_FONT_URL: process.env.CUSTOM_FONT_URL,
      CDN_USE_GLOBAL: process.env.CDN_USE_GLOBAL === '1',

      SSRF_ALLOW_PRIVATE_IP_ADDRESS: process.env.SSRF_ALLOW_PRIVATE_IP_ADDRESS === '1',
      SSRF_ALLOW_IP_ADDRESS_LIST: process.env.SSRF_ALLOW_IP_ADDRESS_LIST,

      // Supabase configuration
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

      // Stripe configuration
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

      // Klyno configuration
      NEXT_PUBLIC_KLYNO_BRANDING: process.env.NEXT_PUBLIC_KLYNO_BRANDING !== 'false',
      NEXT_PUBLIC_BYOK_ENABLED: process.env.NEXT_PUBLIC_BYOK_ENABLED !== 'false',
      KLYNO_OPENAI_API_KEY: process.env.KLYNO_OPENAI_API_KEY,
      KLYNO_ANTHROPIC_API_KEY: process.env.KLYNO_ANTHROPIC_API_KEY,
      KLYNO_GOOGLE_API_KEY: process.env.KLYNO_GOOGLE_API_KEY,
    },
  });
};

export const appEnv = getAppConfig();
