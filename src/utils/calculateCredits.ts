
interface Usage {
    // Common aggregate fields
    totalTokens?: number;
    totalInputTokens?: number;
    totalOutputTokens?: number;

    // More granular fields sometimes present in metadata
    inputTextTokens?: number;
    inputAudioTokens?: number;
    inputCitationTokens?: number;
    inputCacheMissTokens?: number;
    inputCachedTokens?: number;
    inputWriteCacheTokens?: number;

    outputTextTokens?: number;
    outputReasoningTokens?: number;
    outputAudioTokens?: number;
}

interface Pricing {
    input?: number;  // USD per 1K input tokens
    output?: number; // USD per 1K output tokens
}

interface Plan {
    name: string;
    price: number;           // USD/month user pays
    displayCredits: number;  // e.g. 5,000,000 for Starter
    profitMargin?: number;   // e.g. 1.2 for 20% profit
}

// Define all plans
const plans: Plan[] = [
    { name: "Starter", price: 12.99, displayCredits: 5_000_000, profitMargin: 1.2 },
    { name: "Creator Pro", price: 29.99, displayCredits: 15_000_000, profitMargin: 1.2 },
    { name: "Team Workspace", price: 49.99, displayCredits: 35_000_000, profitMargin: 1.2 },
    { name: "Enterprise+", price: 199.99, displayCredits: 70_000_000, profitMargin: 1.2 }, // double team workspace
];

/**
 * Calculate credits to deduct based on usage and plan name
 * @param usage - Token usage from OpenRouter
 * @param pricing - Model pricing per 1K tokens
 * @param planName - Plan name
 * @param creditRate - $ per credit (default $0.001)
 */
export function calculateCreditsByPlan(
    usage: Usage,
    pricing: Pricing,
    planName: string,
    creditRate = 0.001
): number {
    // Resolve plan (fallback to default margin if not found)
    const plan = plans.find(p => p.name.toLowerCase() === (planName || '').toLowerCase());
    const profitMargin = (plan?.profitMargin ?? 1.2);

    // Normalize token usage
    const inputTokensFromBreakdown =
        (usage.inputTextTokens ?? 0) +
        (usage.inputAudioTokens ?? 0) +
        (usage.inputCitationTokens ?? 0) +
        (usage.inputCacheMissTokens ?? 0) +
        (usage.inputCachedTokens ?? 0) +
        (usage.inputWriteCacheTokens ?? 0);

    const outputTokensFromBreakdown =
        (usage.outputTextTokens ?? 0) +
        (usage.outputReasoningTokens ?? 0) +
        (usage.outputAudioTokens ?? 0);

    const inputTokens = (usage.totalInputTokens ?? inputTokensFromBreakdown);
    const outputTokens = (usage.totalOutputTokens ?? outputTokensFromBreakdown);
    const aggregateTokens = usage.totalTokens ?? 0;

    // Step 1: Calculate USD cost of usage
    const inputRate = pricing.input ?? 0;
    const outputRate = pricing.output ?? 0;

    let totalUsd = 0;
    if ((inputTokens ?? 0) > 0 || (outputTokens ?? 0) > 0) {
        const inputUsd = ((inputTokens || 0) / 1000) * inputRate;
        const outputUsd = ((outputTokens || 0) / 1000) * outputRate;
        totalUsd = inputUsd + outputUsd;
    } else if (aggregateTokens > 0) {
        // Fallback: if only totalTokens is available, use average rate
        const avgRate = (inputRate + outputRate) / 2;
        totalUsd = (aggregateTokens / 1000) * avgRate;
    }

    // No usage results in zero credits
    if (totalUsd <= 0) return 0;

    // Step 2: Apply profit margin (default 20%)
    const withProfitUsd = totalUsd * profitMargin;

    // Step 3: Convert USD to credits via creditRate ($ per credit)
    if (creditRate <= 0) return 0;
    const creditsToDeduct = Math.ceil(withProfitUsd / creditRate);

    return creditsToDeduct;
}