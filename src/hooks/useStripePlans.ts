import { useCallback, useEffect, useState } from 'react';

import { lambdaClient } from '@/libs/trpc/client';
import { StripePlan } from '@/types/stripe';

export const useStripePlans = () => {
  const [plans, setPlans] = useState<StripePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const testStripeConnection = useCallback(async () => {
    try {
      const testResult = await lambdaClient.stripe.test.query();
      return testResult.success;
    } catch (err) {
      console.error('Stripe test failed:', err);
      return false;
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First test the connection
      const isConnected = await testStripeConnection();
      if (!isConnected) {
        console.warn('Stripe connection test failed, but continuing with plans fetch');
      }

      const data = await lambdaClient.stripe.getPlans.query();

      // Validate the plans data structure
      if (Array.isArray(data)) {
        const validPlans = data.filter((plan) => {
          const isValid =
            plan &&
            plan.id &&
            plan.name &&
            plan.monthlyPriceId &&
            plan.yearlyPriceId &&
            typeof plan.price === 'object' &&
            typeof plan.price.monthly === 'number' &&
            typeof plan.price.yearly === 'number';

          if (!isValid) {
            console.warn('Invalid plan structure:', plan);
          }

          return isValid;
        });

        console.log(`Found ${validPlans.length} valid plans out of ${data.length} total`);
        setPlans(validPlans);
      } else {
        console.warn('Stripe plans data is not an array:', data);
        setPlans([]);
      }
    } catch (err) {
      console.error('Error fetching Stripe plans:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch plans'));
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [testStripeConnection]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const refreshPlans = useCallback(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    error,
    isLoading,
    refreshPlans,
  };
};
