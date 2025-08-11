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
    const planKey = product.metadata.plan_key || product.metadata.plan;
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

    // If no match found, try to parse from metadata
    return this.parsePlanFromMetadata(product.metadata);
  }

  /**
   * Parse plan configuration from product metadata
   */
  private static parsePlanFromMetadata(metadata: Stripe.Metadata): SubscriptionPlan | null {
    try {
      const monthlyCredits = parseInt(metadata.monthly_credits || '0');
      const fileStorageGB = parseInt(metadata.file_storage_gb || '1');
      const vectorStorageMB = parseInt(metadata.vector_storage_mb || '50');

      if (monthlyCredits === 0) {
        return null;
      }

      return {
        id: metadata.plan_id || 'custom',
        name: metadata.plan_name || 'Custom Plan',
        monthlyCredits,
        fileStorageLimitGB: fileStorageGB,
        vectorStorageLimitMB: vectorStorageMB,
        price: parseInt(metadata.price_cents || '0'),
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
      plan.id &&
      plan.name &&
      plan.monthlyCredits > 0 &&
      plan.fileStorageLimitGB > 0 &&
      plan.vectorStorageLimitMB > 0 &&
      plan.price >= 0 &&
      ['month', 'year'].includes(plan.interval)
    );
  }
}
