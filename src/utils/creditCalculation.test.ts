import { describe, expect, it } from 'vitest';

import { ModelTokensUsage } from '@/types/message';

import {
  calculateCreditsFromMetadata,
  calculateCreditsFromTokens,
  calculateMessageCredits,
} from './creditCalculation';

describe('Credit Calculation', () => {
  describe('calculateCreditsFromTokens', () => {
    it('should return 0 for 0 or negative tokens', () => {
      expect(calculateCreditsFromTokens(0)).toBe(0);
      expect(calculateCreditsFromTokens(-100)).toBe(0);
    });

    it('should calculate credits correctly with 100 tokens = 1 credit', () => {
      expect(calculateCreditsFromTokens(100)).toBe(1);
      expect(calculateCreditsFromTokens(200)).toBe(2);
      expect(calculateCreditsFromTokens(150)).toBe(2); // Rounds up
      expect(calculateCreditsFromTokens(99)).toBe(1); // Rounds up
      expect(calculateCreditsFromTokens(101)).toBe(2); // Rounds up
    });

    it('should handle large token counts', () => {
      expect(calculateCreditsFromTokens(1000)).toBe(10);
      expect(calculateCreditsFromTokens(10000)).toBe(100);
      expect(calculateCreditsFromTokens(9999)).toBe(100); // Rounds up
    });
  });

  describe('calculateCreditsFromMetadata', () => {
    it('should return 0 for empty metadata', () => {
      expect(calculateCreditsFromMetadata({})).toBe(0);
      expect(calculateCreditsFromMetadata(undefined as any)).toBe(0);
    });

    it('should use totalTokens when available', () => {
      const metadata: ModelTokensUsage = {
        totalTokens: 250,
      };
      expect(calculateCreditsFromMetadata(metadata)).toBe(3); // 250 tokens = 3 credits
    });

    it('should calculate from individual token types when totalTokens not available', () => {
      const metadata: ModelTokensUsage = {
        inputTextTokens: 100,
        outputTextTokens: 150,
        inputAudioTokens: 50,
      };
      // Total: 100 + 150 + 50 = 300 tokens = 3 credits
      expect(calculateCreditsFromMetadata(metadata)).toBe(3);
    });

    it('should handle mixed token types with fallbacks', () => {
      const metadata: ModelTokensUsage = {
        totalInputTokens: 200,
        totalOutputTokens: 300,
        inputCachedTokens: 50,
      };
      // Uses totalInputTokens + totalOutputTokens: 200 + 300 = 500 tokens = 5 credits
      expect(calculateCreditsFromMetadata(metadata)).toBe(5);
    });

    it('should prioritize totalTokens over individual calculations', () => {
      const metadata: ModelTokensUsage = {
        totalTokens: 100,
        inputTextTokens: 200,
        outputTextTokens: 300,
      };
      // Should use totalTokens (100) = 1 credit, not sum of individual tokens
      expect(calculateCreditsFromMetadata(metadata)).toBe(1);
    });
  });

  describe('calculateMessageCredits', () => {
    it('should return 0 for user messages', () => {
      const metadata: ModelTokensUsage = { totalTokens: 1000 };
      expect(calculateMessageCredits('user', metadata)).toBe(0);
    });

    it('should return 0 for system messages', () => {
      const metadata: ModelTokensUsage = { totalTokens: 1000 };
      expect(calculateMessageCredits('system', metadata)).toBe(0);
    });

    it('should calculate credits for assistant messages', () => {
      const metadata: ModelTokensUsage = { totalTokens: 250 };
      expect(calculateMessageCredits('assistant', metadata)).toBe(3); // 250 tokens = 3 credits
    });

    it('should return 0 for assistant messages with no metadata', () => {
      expect(calculateMessageCredits('assistant')).toBe(0);
    });

    it('should handle complex metadata for assistant messages', () => {
      const metadata: ModelTokensUsage = {
        inputTextTokens: 100,
        outputTextTokens: 150,
        inputAudioTokens: 50,
        outputReasoningTokens: 25,
      };
      // Total: 100 + 150 + 50 + 25 = 325 tokens = 4 credits
      expect(calculateMessageCredits('assistant', metadata)).toBe(4);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small token counts', () => {
      expect(calculateCreditsFromTokens(1)).toBe(1); // 1 token = 1 credit (rounds up)
      expect(calculateCreditsFromTokens(50)).toBe(1); // 50 tokens = 1 credit (rounds up)
    });

    it('should handle exact multiples of 100', () => {
      expect(calculateCreditsFromTokens(100)).toBe(1);
      expect(calculateCreditsFromTokens(200)).toBe(2);
      expect(calculateCreditsFromTokens(1000)).toBe(10);
    });

    it('should handle metadata with only some token types', () => {
      const metadata: ModelTokensUsage = {
        inputTextTokens: 100,
        // Missing other token types
      };
      expect(calculateCreditsFromMetadata(metadata)).toBe(1);
    });

    it('should handle metadata with zero values', () => {
      const metadata: ModelTokensUsage = {
        inputTextTokens: 0,
        outputTextTokens: 0,
        totalTokens: 0,
      };
      expect(calculateCreditsFromMetadata(metadata)).toBe(0);
    });
  });
});
