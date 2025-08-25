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
  updateOrganizationSubscriptionInfo: authedProcedure
    .input(z.object({
      ownerId: z.string().min(1),
      creditsUsed: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      const subscriptionManager = new SubscriptionManager();
      const result = await subscriptionManager.updateOrganizationSubscriptionInfo(input.ownerId, input.creditsUsed);
      return {
        success: result.success,
        data: result.subscription,
        message: result.message,
      };
    }),
    updateSubscriptionFileLimit: authedProcedure.input(z.object({
      userId: z.string().min(1),
      fileSize: z.number().min(0),
    })).mutation(async ({ input }) => {
      const subscriptionManager = new SubscriptionManager();
      const result = await subscriptionManager.updateSubscriptionFileLimit(input.userId, input.fileSize);
      return {
        success: result.success,
        data: result.subscription,
        message: result.message,
      };
    }),
});
