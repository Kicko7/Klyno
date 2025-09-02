import { Stripe } from 'stripe';

import { SubscriptionPlan } from './subscriptionManager';

/**
 * Maps Stripe product metadata to subscription plan configuration
 */
export class PlanMapper {
  private static readonly PLAN_METADATA_MAP: Record<string, SubscriptionPlan> = {
    'starter': {
      id: 'starter',
      name: 'Starter',
      monthlyCredits: 5_000_000,
      fileStorageLimitGB: 1,
      vectorStorageLimitMB: 50,
      price: 1299, // $12.99 in cents
      interval: 'month',
    },
    'team-workspace': {
      id: 'team-workspace',
      name: 'Team Workspace',
      monthlyCredits: 35_000_000,
      fileStorageLimitGB: 10,
      vectorStorageLimitMB: 40_000,
      price: 4999, // $49.99 in cents
      interval: 'month',
    },
    'creator-pro': {
      id: 'creator-pro',
      name: 'Creator Pro',
      monthlyCredits: 15_000_000,
      fileStorageLimitGB: 3,
      vectorStorageLimitMB: 150,
      price: 2999, // $29.99 in cents
      interval: 'month',
    },
    'enterprise': {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyCredits: 50_000_000,
      fileStorageLimitGB: 10,
      vectorStorageLimitMB: 500,
      price: 9999, // $99.99 in cents
      interval: 'month',
    },
  };

  /**
   * Get plan configuration from Stripe product metadata
   */
  static getPlanFromStripeProduct(product: Stripe.Product): SubscriptionPlan | null {
    // Try to get plan from product metadata
    const planKey = product.metadata.plan_key || product.metadata.plan || product.metadata.plan_id;
    if (planKey && this.PLAN_METADATA_MAP[planKey]) {
      return this.PLAN_METADATA_MAP[planKey];
    }

    // Fallback: try to infer from product name
    const productName = product.name?.toLowerCase();
    if (productName) {
      if (productName.includes('starter')) {
        return this.PLAN_METADATA_MAP.starter;
      } else if (productName.includes('pro') || productName.includes('creator')) {
        return this.PLAN_METADATA_MAP['creator-pro'];
      } else if (productName.includes('enterprise')) {
        return this.PLAN_METADATA_MAP.enterprise;
      }
    }

    // If no match found, try to parse from metadata (supports "infinite" values)
    const parsed = this.parsePlanFromMetadata(product.metadata);
    if (parsed) {
      // If name fell back to generic, use product.name for better UX
      if (!product.metadata.plan_name && product.name && parsed.name === 'Custom Plan') {
        return { ...parsed, name: product.name };
      }
      return parsed;
    }
    return null;
  }

  /**
   * Parse plan configuration from product metadata
   */
  private static parsePlanFromMetadata(metadata: Stripe.Metadata): SubscriptionPlan | null {
    try {
      const toNumberOrZero = (val?: string): number => {
        if (val === undefined || val === null) return 0;
        const lower = String(val).trim().toLowerCase();
        if (lower === 'infinite' || lower === 'unlimited') return 0; // 0 represents unlimited in our system
        const n = parseInt(lower, 10);
        return Number.isFinite(n) ? n : 0;
      };

      const toNumberWithDefault = (val: string | undefined, defaultValue: number): number => {
        if (val === undefined || val === null || String(val).trim() === '') return defaultValue;
        return toNumberOrZero(val);
      };

      const monthlyCredits = toNumberWithDefault(metadata.monthly_credits, 0);
      const fileStorageGB = toNumberWithDefault(metadata.file_storage_gb, 1); // default 1GB if missing
      const vectorStorageMB = toNumberWithDefault(metadata.vector_storage_mb, 50); // default 50MB if missing

      // Note: monthlyCredits === 0 signifies unlimited; treat as valid plan

      return {
        id: metadata.plan_id || 'custom',
        name: metadata.plan_name || 'Custom Plan',
        monthlyCredits,
        fileStorageLimitGB: fileStorageGB,
        vectorStorageLimitMB: vectorStorageMB,
        price: toNumberOrZero(metadata.price_cents),
        interval: (metadata.billing_interval as 'month' | 'year') || 'month',
      };
    } catch (error) {
      console.error('Error parsing plan from metadata:', error);
      return null;
    }
  }

  /**
   * Get plan configuration by ID
   */
  static getPlanById(planId: string): SubscriptionPlan | null {
    return this.PLAN_METADATA_MAP[planId] || null;
  }

  /**
   * Get all available plans
   */
  static getAllPlans(): SubscriptionPlan[] {
    return Object.values(this.PLAN_METADATA_MAP);
  }

  /**
   * Validate if a plan configuration is valid
   */
  static validatePlan(plan: SubscriptionPlan): boolean {
    return (
      typeof plan.id === 'string' &&
      plan.id.length > 0 &&
      typeof plan.name === 'string' &&
      plan.name.length > 0 &&
      plan.monthlyCredits > 0 &&
      plan.fileStorageLimitGB > 0 &&
      plan.vectorStorageLimitMB > 0 &&
      plan.price >= 0 &&
      ['month', 'year'].includes(plan.interval)
    );
  }
}
