import { useCallback, useEffect, useRef, useState } from 'react';

import { CreditService } from '@/services/creditService';
import { CreditUsage } from '@/types/redis';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const useCreditTracking = (userId: string) => {
  const [totalCredits, setTotalCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creditServiceRef = useRef<CreditService | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lazy initialize CreditService with error handling
  const getCreditService = useCallback(() => {
    if (!creditServiceRef.current) {
      try {
        creditServiceRef.current = new CreditService();
      } catch (err) {
        console.warn('CreditService not available (likely client-side):', err);
        return null;
      }
    }
    return creditServiceRef.current;
  }, []);

  // Track credit usage
  const trackCredits = useCallback(
    async (messageId: string, credits: number, metadata = {}) => {
      try {
        const creditService = getCreditService();
        if (!creditService) {
          console.warn('Credit tracking not available on client side');
          return;
        }
        await creditService.trackCredits(userId, messageId, credits, metadata);
        setTotalCredits((prev) => prev + credits);
      } catch (err) {
        console.error('Error tracking credits:', err);
        setError(err instanceof Error ? err.message : 'Failed to track credits');
      }
    },
    [userId, getCreditService],
  );

  // Sync credits to PostgreSQL
  const syncCredits = useCallback(async () => {
    try {
      const creditService = getCreditService();
      if (!creditService) {
        console.warn('Credit syncing not available on client side');
        return;
      }

      setIsLoading(true);
      const unsyncedCredits = await creditService.getUnsyncedCredits(userId);
      if (unsyncedCredits.length === 0) return;

      // Group credits by message ID
      const messageIds = unsyncedCredits.map((credit: CreditUsage) => credit.messageId);

      // Mark credits as synced in Redis
      await creditService.markCreditsSynced(userId, messageIds);

      // Update total credits
      const total = unsyncedCredits.reduce(
        (sum: number, credit: CreditUsage) => sum + credit.credits,
        0,
      );
      setTotalCredits(total);
    } catch (err) {
      console.error('Error syncing credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync credits');
    } finally {
      setIsLoading(false);
    }
  }, [userId, getCreditService]);

  // Load initial credits
  useEffect(() => {
    const loadCredits = async () => {
      try {
        const creditService = getCreditService();
        if (!creditService) {
          console.warn('Credit loading not available on client side');
          return;
        }

        setIsLoading(true);
        const total = await creditService.getTotalCredits(userId);
        setTotalCredits(total);
      } catch (err) {
        console.error('Error loading credits:', err);
        setError(err instanceof Error ? err.message : 'Failed to load credits');
      } finally {
        setIsLoading(false);
      }
    };

    loadCredits();
  }, [userId, getCreditService]);

  // Set up periodic sync - Fixed infinite loop by removing syncCredits from dependencies
  useEffect(() => {
    const startSync = async () => {
      try {
        const creditService = getCreditService();
        if (!creditService) {
          console.warn('Credit syncing not available on client side');
          return;
        }

        setIsLoading(true);
        const unsyncedCredits = await creditService.getUnsyncedCredits(userId);
        if (unsyncedCredits.length === 0) return;

        // Group credits by message ID
        const messageIds = unsyncedCredits.map((credit: CreditUsage) => credit.messageId);

        // Mark credits as synced in Redis
        await creditService.markCreditsSynced(userId, messageIds);

        // Update total credits
        const total = unsyncedCredits.reduce(
          (sum: number, credit: CreditUsage) => sum + credit.credits,
          0,
        );
        setTotalCredits(total);
      } catch (err) {
        console.error('Error syncing credits:', err);
        setError(err instanceof Error ? err.message : 'Failed to sync credits');
      } finally {
        setIsLoading(false);
      }

      syncTimeoutRef.current = setTimeout(startSync, SYNC_INTERVAL);
    };

    startSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [userId, getCreditService]); // Only depend on userId and getCreditService, not syncCredits

  return {
    totalCredits,
    isLoading,
    error,
    trackCredits,
    syncCredits,
  };
};
