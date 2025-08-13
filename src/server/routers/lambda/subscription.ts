import { z } from 'zod';

import { authedProcedure, router } from '@/libs/trpc/lambda';
import { SubscriptionManager } from '@/server/services/subscriptions/subscriptionManager';

export const subscriptionRouter = router({
  getUserSubscriptionInfo: authedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      try {
        const subscriptionManager = new SubscriptionManager();
        const subscriptionInfo = await subscriptionManager.getUserSubscriptionInfo(input.userId);

        if (!subscriptionInfo) {
          return {
            success: true,
            data: null,
            message: 'No subscription found',
          };
        }

        return {
          success: true,
          data: subscriptionInfo,
          message: 'Subscription info retrieved successfully',
        };
      } catch (error) {
        console.error('Error getting user subscription info:', error);
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Failed to get subscription info',
        };
      }
    }),
});
