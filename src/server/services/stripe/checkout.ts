import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { getStripeConfig } from '@/config/stripe';
import { db } from '@/database';
import { users } from '@/database/schemas/user';

export class StripeCheckoutService {
  private stripe: Stripe;

  constructor() {
    const config = getStripeConfig();
    if (!config.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required for StripeCheckoutService');
    }

    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: config.STRIPE_API_VERSION as any,
    });
  }

  /**
   * Create a Stripe customer if one doesn't exist
   * Handles cases where the stripe_customer_id column might not exist yet
   */
  async ensureCustomer(userId: string, email?: string): Promise<string> {
    try {
      // Check if user already has a Stripe customer ID
      const user = await db
        .select({ stripeCustomerId: users.stripeCustomerId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user[0]?.stripeCustomerId) {
        return user[0].stripeCustomerId;
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });

      // Try to update user with Stripe customer ID
      try {
        await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
      } catch (updateError) {
        // If the column doesn't exist yet, log the error but continue
        // The customer was created in Stripe, so we can return the ID
        console.warn(
          'Failed to update user with stripe_customer_id (column may not exist yet):',
          updateError,
        );
      }

      return customer.id;
    } catch (error) {
      console.error('Error ensuring Stripe customer:', error);
      throw new Error(
        `Failed to create or retrieve Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a checkout session that automatically detects the price type
   * and creates either a subscription or one-time payment session
   */
  async createAutoCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    try {
      // Check the price type first
      const price = await this.stripe.prices.retrieve(priceId);

      console.log(`Price ${priceId} type:`, price.recurring ? 'recurring' : 'one-time');
      console.log(`Price details:`, {
        id: price.id,
        recurring: price.recurring,
        unit_amount: price.unit_amount,
        currency: price.currency,
        product: price.product,
      });

      if (price.recurring) {
        // This is a subscription purchase
        console.log(`Creating subscription checkout session for price ${priceId}`);
        return await this.createSubscriptionCheckoutSession(userId, priceId, successUrl, cancelUrl);
      } else {
        // This is a one-time credit purchase
        console.log(`Creating one-time checkout session for price ${priceId}`);
        return await this.createCheckoutSession(userId, priceId, successUrl, cancelUrl);
      }
    } catch (error) {
      console.error('Error creating auto checkout session:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('No such price')) {
          throw new Error(
            `Price ${priceId} not found in Stripe. Please check your Stripe configuration.`,
          );
        } else if (error.message.includes('Invalid API key')) {
          throw new Error('Invalid Stripe API key. Please check your Stripe configuration.');
        } else {
          throw new Error(`Failed to create checkout session: ${error.message}`);
        }
      } else {
        throw new Error(`Failed to create checkout session: Unknown error occurred`);
      }
    }
  }

  /**
   * Create a checkout session for credit purchase
   */
  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    try {
      // Ensure user has a Stripe customer
      const customerId = await this.ensureCustomer(userId);

      // Verify the price is a one-time price (not recurring)
      const price = await this.stripe.prices.retrieve(priceId);
      if (price.recurring) {
        throw new Error('Only one-time prices are supported for credit purchases');
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment', // One-time payment, not subscription
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          priceId,
        },
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(
        `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a checkout session for subscription purchase
   */
  async createSubscriptionCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    try {
      // Ensure user has a Stripe customer
      const customerId = await this.ensureCustomer(userId);

      // Verify the price is a recurring price (subscription)
      const price = await this.stripe.prices.retrieve(priceId);
      if (!price.recurring) {
        throw new Error('Only recurring prices are supported for subscription purchases');
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          priceId,
        },
      });

      return session;
    } catch (error) {
      console.error('Error creating subscription checkout session:', error);
      throw new Error(
        `Failed to create subscription checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get or create a Stripe customer ID for a user
   * This method is safe to call even if the stripe_customer_id column doesn't exist yet
   */
  async getOrCreateCustomerId(userId: string, email?: string): Promise<string> {
    try {
      // First try to get existing customer ID
      const user = await db
        .select({ stripeCustomerId: users.stripeCustomerId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user[0]?.stripeCustomerId) {
        return user[0].stripeCustomerId;
      }

      // If no customer ID exists, create one
      return await this.ensureCustomer(userId, email);
    } catch (error) {
      // If there's a database error (e.g., column doesn't exist),
      // create the customer in Stripe anyway
      console.warn('Database error when checking for existing customer, creating new one:', error);

      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });

      return customer.id;
    }
  }

  /**
   * Get credits amount from price or product metadata
   */
  async getCreditsAmount(priceId: string): Promise<number> {
    const price = await this.stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });

    const product = price.product as Stripe.Product;

    // Check price metadata first, then product metadata
    const creditsAmount = price.metadata.credits_amount || product.metadata.credits_amount;

    if (!creditsAmount) {
      throw new Error(`No credits_amount found in metadata for price ${priceId}`);
    }

    return parseInt(creditsAmount, 10);
  }
}
