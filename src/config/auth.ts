/* eslint-disable sort-keys-fix/sort-keys-fix , typescript-sort-keys/interface */
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      // ===== Clerk ===== //
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
      CLERK_SECRET_KEY?: string;
      CLERK_WEBHOOK_SECRET?: string;
    }
  }
}


export const getAuthConfig = () => {
  return createEnv({
    client: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
      /**
       * whether to enabled clerk
       */
      NEXT_PUBLIC_ENABLE_CLERK_AUTH: z.boolean().optional(),

      // Disabled NextAuth - Only Clerk is supported
      NEXT_PUBLIC_ENABLE_NEXT_AUTH: z.boolean().optional().default(false),
    },
    server: {
      // Clerk
      CLERK_SECRET_KEY: z.string().optional(),
      CLERK_WEBHOOK_SECRET: z.string().optional(),
    },

    runtimeEnv: {
      // Clerk
      NEXT_PUBLIC_ENABLE_CLERK_AUTH: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,

      // NextAuth disabled - only Clerk is supported
      NEXT_PUBLIC_ENABLE_NEXT_AUTH: false,
    },
  });
};

export const authEnv = getAuthConfig();
