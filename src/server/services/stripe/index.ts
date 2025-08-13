import Stripe from 'stripe';

import { getStripeConfig } from '@/config/stripe';
import { StripePlan, StripeProduct } from '@/types/stripe';

export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    try {
      const config = getStripeConfig();

      if (config.STRIPE_SECRET_KEY) {
        this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
          apiVersion: config.STRIPE_API_VERSION as any,
        });
      }
    } catch (error) {
      console.error('Error initializing Stripe service:', error);
      this.stripe = null;
    }
  }

  async getProducts(): Promise<StripeProduct[]> {
    if (!this.stripe) {
      return [];
    }

    try {
      const products = await this.stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      });

      const productsWithPrices: StripeProduct[] = [];

      for (const product of products.data) {
        const prices = await this.stripe.prices.list({
          product: product.id,
          active: true,
        });

        productsWithPrices.push({
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          marketing_features: (product as any).marketing_features
            ? Array.isArray((product as any).marketing_features)
              ? (product as any).marketing_features.map((feature: any) =>
                  typeof feature === 'string' ? feature : feature.name || feature,
                )
              : [(product as any).marketing_features]
            : [],
          prices: prices.data.map((price) => ({
            id: price.id,
            unit_amount: price.unit_amount || 0,
            currency: price.currency,
            recurring: price.recurring as any,
          })),
        });
      }

      return productsWithPrices;
    } catch (error) {
      console.error('Error fetching Stripe products:', error);
      return [];
    }
  }

  async getPlans(): Promise<StripePlan[]> {
    if (!this.stripe) {
      return [];
    }

    try {
      const products = await this.getProducts();
      const plans: StripePlan[] = [];

      for (const product of products) {
        if (product.prices.length < 2) continue; // Skip products without both monthly and yearly prices

        const monthlyPrice = product.prices.find(
          (price) => price.recurring.interval === 'month' && price.recurring.interval_count === 1,
        );
        const yearlyPrice = product.prices.find(
          (price) => price.recurring.interval === 'year' && price.recurring.interval_count === 1,
        );

        if (!monthlyPrice || !yearlyPrice) continue;

        const monthlyAmount = monthlyPrice.unit_amount / 100;
        const yearlyAmount = yearlyPrice.unit_amount / 100;
        const discount = ((monthlyAmount * 12 - yearlyAmount) / (monthlyAmount * 12)) * 100;

        const features = product.marketing_features || [];

        plans.push({
          id: product.id,
          name: product.name,
          description: product.description || '',
          features,
          popular: product.metadata.popular === 'true',
          icon: product.metadata.icon || 'star',
          color: product.metadata.color || 'primary',
          price: {
            monthly: monthlyAmount,
            yearly: yearlyAmount,
          },
          discount: Math.round(discount * 10) / 10, // Round to 1 decimal place
          // Add price IDs for checkout
          monthlyPriceId: monthlyPrice.id,
          yearlyPriceId: yearlyPrice.id,
        });
      }

      // Sort plans by monthly price in ascending order
      return plans.sort((a, b) => a.price.monthly - b.price.monthly);
    } catch (error) {
      console.error('Error fetching Stripe plans:', error);
      return [];
    }
  }
}
