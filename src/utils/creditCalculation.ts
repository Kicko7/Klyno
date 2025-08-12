import { ModelTokensUsage } from '@/types/message';

/**
 * Credit calculation utility for team chat messages
 * Conversion rate: 100 tokens = 1 credit
 */

export const TOKEN_TO_CREDIT_RATIO = 100;

/**
 * Calculate credits from token usage
 * @param tokens - Number of tokens
 * @returns Number of credits (rounded up to nearest whole number)
 */
export const calculateCreditsFromTokens = (tokens: number): number => {
  if (tokens <= 0) return 0;
  return Math.ceil(tokens / TOKEN_TO_CREDIT_RATIO);
};

/**
 * Calculate total credits from message metadata
 * @param metadata - Message metadata containing token usage information
 * @returns Total credits consumed
 */
export const calculateCreditsFromMetadata = (metadata: ModelTokensUsage): number => {
  if (!metadata) return 0;

  // Use totalTokens if available, otherwise calculate from individual token types
  if (metadata.totalTokens) {
    return calculateCreditsFromTokens(metadata.totalTokens);
  }

  // Calculate from individual token types
  let totalTokens = 0;

  // Input tokens
  if (metadata.inputTextTokens) totalTokens += metadata.inputTextTokens;
  if (metadata.inputAudioTokens) totalTokens += metadata.inputAudioTokens;
  if (metadata.inputCitationTokens) totalTokens += metadata.inputCitationTokens;
  if (metadata.inputCacheMissTokens) totalTokens += metadata.inputCacheMissTokens;
  if (metadata.inputCachedTokens) totalTokens += metadata.inputCachedTokens;
  if (metadata.inputWriteCacheTokens) totalTokens += metadata.inputWriteCacheTokens;

  // Output tokens
  if (metadata.outputTextTokens) totalTokens += metadata.outputTextTokens;
  if (metadata.outputReasoningTokens) totalTokens += metadata.outputReasoningTokens;
  if (metadata.outputAudioTokens) totalTokens += metadata.outputAudioTokens;

  // Fallback to totalInputTokens and totalOutputTokens if individual counts are not available
  if (totalTokens === 0) {
    if (metadata.totalInputTokens) totalTokens += metadata.totalInputTokens;
    if (metadata.totalOutputTokens) totalTokens += metadata.totalOutputTokens;
  }

  return calculateCreditsFromTokens(totalTokens);
};

/**
 * Calculate credits for a specific message type
 * @param messageType - Type of message ('user', 'assistant', 'system')
 * @param metadata - Message metadata
 * @returns Credits consumed (0 for user messages, calculated for assistant messages)
 */
export const calculateMessageCredits = (
  messageType: 'user' | 'assistant' | 'system',
  metadata?: ModelTokensUsage,
): number => {
  // Only assistant messages consume credits
  if (messageType !== 'assistant') return 0;
  
  if (!metadata) return 0;
  
  return calculateCreditsFromMetadata(metadata);
};
