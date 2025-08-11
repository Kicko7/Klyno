import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      STRIPE_API_VERSION?: string;
    }
  }
}

export const getStripeConfig = () => {
  try {
    const config = createEnv({
      client: {
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
      },
      server: {
        STRIPE_SECRET_KEY: z.string().optional(),
        STRIPE_WEBHOOK_SECRET: z.string().optional(),
        STRIPE_API_VERSION: z.string().optional(),
      },
      runtimeEnv: {
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        STRIPE_API_VERSION: process.env.STRIPE_API_VERSION,
      },
    });

    return config;
  } catch (error) {
    console.error('Failed to create Stripe config:', error);
    return {
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: undefined,
      STRIPE_SECRET_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
      STRIPE_API_VERSION: process.env.STRIPE_API_VERSION,
    };
  }
};
