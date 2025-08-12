import { useCallback, useEffect, useState } from 'react';

import type { UserSubscriptionItem, UserUsageQuotaItem } from '@/database/schemas';
import { lambdaClient } from '@/libs/trpc/client';
import { useUserStore } from '@/store/user';

export interface UserSubscriptionInfo {
  subscription: UserSubscriptionItem | null;
  usageQuota: Partial<UserUsageQuotaItem> | null;
  currentCredits: number;
}

export const useUserSubscription = () => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isSignedIn } = useUserStore((s) => ({
    user: s.user,
    isSignedIn: s.isSignedIn,
  }));

  const fetchSubscriptionInfo = useCallback(async () => {
    if (!isSignedIn || !user?.id) {
      setSubscriptionInfo(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await lambdaClient.subscription.getUserSubscriptionInfo.query({
        userId: user.id,
      });

      if (result.success) {
        setSubscriptionInfo(result.data);
      } else {
        console.error(`[useUserSubscription] Failed to fetch subscription info:`, result.error);
        setError(result.error || 'Failed to fetch subscription info');
        setSubscriptionInfo(null);
      }
    } catch (err) {
      console.error(
        `[useUserSubscription] Error fetching subscription info for user ${user.id}:`,
        err,
      );
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription info');
      setSubscriptionInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    fetchSubscriptionInfo();
  }, [fetchSubscriptionInfo]);

  const refetch = useCallback(() => {
    fetchSubscriptionInfo();
  }, [fetchSubscriptionInfo]);

  const hasActiveSubscription =
    subscriptionInfo?.subscription?.status === 'active' ||
    subscriptionInfo?.subscription?.status === 'trialing';
  const hasAnySubscription = subscriptionInfo?.subscription !== null;
  const needsUpgrade = hasAnySubscription && !hasActiveSubscription;
  const subscriptionStatus = subscriptionInfo?.subscription?.status || null;
  const isTrialing = subscriptionInfo?.subscription?.status === 'trialing';
  const currentPlan = subscriptionInfo?.subscription?.planName || null;
  const nextBillingDate = subscriptionInfo?.subscription?.currentPeriodEnd;

  return {
    subscriptionInfo,
    isLoading,
    error,
    refetch,
    hasActiveSubscription,
    hasAnySubscription,
    needsUpgrade,
    isTrialing,
    currentPlan,
    nextBillingDate,
    subscriptionStatus,
  };
};
