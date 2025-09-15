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
  const [organizationSubscriptionInfo, setOrganizationSubscriptionInfo] =
    useState<UserSubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
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
    } ``
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    fetchSubscriptionInfo();

    const handleSubscriptionUpdate = () => {
      // console.log('🔄 Subscription update event received, refetching...', subscriptionInfo);
      fetchSubscriptionInfo();
    };

    window.addEventListener('update-subscription-info', handleSubscriptionUpdate);

    // ✅ Cleanup event listener on unmount
    return () => {
      window.removeEventListener('update-subscription-info', handleSubscriptionUpdate);
    };
  }, [fetchSubscriptionInfo]);


  const refetch = useCallback(() => {
    fetchSubscriptionInfo();
  }, [fetchSubscriptionInfo]);

  const fetchOrganizationSubscriptionInfo = useCallback(
    async (ownerId: string) => {
      if (!isSignedIn || !user?.id) {
        setOrganizationSubscriptionInfo(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const result = await lambdaClient.subscription.getUserSubscriptionInfo.query({
          userId: ownerId,
        });

        if (result.success && result.data?.subscription?.status === 'active') {
          setOrganizationSubscriptionInfo(result.data);
        } else {
          console.error(`[useUserSubscription] Failed to fetch subscription info:`, result.error);
          setError(result.error || 'Failed to fetch subscription info');
          setOrganizationSubscriptionInfo(null);
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
    },
    [isSignedIn, user?.id],
  );

  useEffect(() => {
    if (ownerId) {
      fetchOrganizationSubscriptionInfo(ownerId);
    }
  }, [ownerId]);

  const updateOrganizationSubscriptionInfo = async (creditsUsed: number, userId?: string) => {
    if (!userId) {
      if (ownerId) {
        const result = await lambdaClient.subscription.updateOrganizationSubscriptionInfo.mutate({
          ownerId,
          creditsUsed,
        });
        if (result.success) {
          console.log('🔍 result', result);
          setOrganizationSubscriptionInfo((prev) =>
            prev
              ? {
                ...prev,
                currentCredits: result.data?.balance ?? 0,
                subscription: result.data ?? null,
              }
              : null,
          );
        } else {
          console.error(`[useUserSubscription] Failed to update organization subscription info`);
          setError('Failed to update organization subscription info');
        }
      }
    } else {
      const result = await lambdaClient.subscription.updateOrganizationSubscriptionInfo.mutate({
        ownerId: userId,
        creditsUsed,
      });

      if (result.success) {
        console.log('🔍 result', result);
        setSubscriptionInfo((prev) =>
          prev
            ? {
              ...prev,
              currentCredits: result.data?.balance ?? 0,
              subscription: result.data ?? null,
            }
            : null,
        );
      } else {
        console.error(`[useUserSubscription] Failed to update organization subscription info`);
        setError('Failed to update organization subscription info');
      }
    }
  };

  const hasActiveSubscription =
    subscriptionInfo?.subscription?.status === 'active' ||
    subscriptionInfo?.subscription?.status === 'trialing';
  const hasAnySubscription = subscriptionInfo?.subscription !== null;
  const needsUpgrade = hasAnySubscription && !hasActiveSubscription;
  const subscriptionStatus = subscriptionInfo?.subscription?.status || null;
  const isTrialing = subscriptionInfo?.subscription?.status === 'trialing';
  const currentPlan = subscriptionInfo?.subscription?.planName || null;
  const nextBillingDate = subscriptionInfo?.subscription?.currentPeriodStart
    ? new Date(
      subscriptionInfo.subscription.currentPeriodStart.getFullYear() + (subscriptionInfo.subscription.interval === 'month' ? 0 : 1),
      subscriptionInfo.subscription.currentPeriodStart.getMonth() + (subscriptionInfo.subscription.interval === 'month' ? 1 : 0),
      subscriptionInfo.subscription.currentPeriodStart.getDate()
    )
    : undefined;


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
    organizationSubscriptionInfo,
    setOwnerId,
    ownerId,
    updateOrganizationSubscriptionInfo,
    fetchSubscriptionInfo,
  };
};
