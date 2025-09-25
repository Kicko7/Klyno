import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { getStripeConfig } from '@/config/stripe';
import { db } from '@/database';
import { users } from '@/database/schemas/user';
import { getAppConfig } from '@/envs/app';

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
        allow_promotion_codes: true,
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
        allow_promotion_codes: true,
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
        // Ensure the resulting subscription gets metadata with userId
        subscription_data: {
          metadata: {
            userId,
          },
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
   * Create a checkout session for upgrading an existing subscription
   * This method handles the upgrade flow differently from new subscriptions
   */
  async createSubscriptionUpgradeSession(
    userId: string,
    priceId: string,
    currentSubscriptionId: string,

  ) {
    try {
      // Ensure user has a Stripe customer
      const customerId = await this.ensureCustomer(userId);

      // Verify the price is a recurring price (subscription)
      const price = await this.stripe.prices.retrieve(priceId);
      if (!price.recurring) {
        throw new Error('Only recurring prices are supported for subscription upgrades');
      }

      // Verify the current subscription exists and belongs to the user
      const currentSubscription = await this.stripe.subscriptions.retrieve(currentSubscriptionId);
      if (currentSubscription.customer !== customerId) {
        throw new Error('Current subscription does not belong to this user');
      }

      // Create upgrade checkout session

      const appConfig = getAppConfig();
      const successUrl = `${appConfig.APP_URL}/pricing`;
      const cancelUrl = `${appConfig.APP_URL}/pricing`;
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        allow_promotion_codes: true,
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
          action: 'upgrade',
          currentSubscriptionId,
        },
        // Ensure the resulting subscription gets metadata for upgrade tracking
        // Note: proration_behavior cannot be set in checkout sessions for upgrades
        // Proration will be handled by Stripe automatically when the new subscription starts
        subscription_data: {
          metadata: {
            userId,
            action: 'upgrade',
            previousSubscriptionId: currentSubscriptionId,
            upgradeDate: new Date().toISOString(),
          },
        },
      });

      console.log(`✅ Upgrade checkout session created for user ${userId} from ${currentSubscriptionId} to ${priceId}`);
      return session;
    } catch (error) {
      console.error('Error creating subscription upgrade session:', error);
      throw new Error(
        `Failed to create subscription upgrade session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Immediately upgrade a subscription to a new plan
   * This changes the current subscription instead of creating a new one
   */
  async upgradeSubscriptionImmediately(
    userId: string,
    currentSubscriptionId: string,
    newPriceId: string,
  ) {
    try {
      const customerId = await this.ensureCustomer(userId);

      const currentSubscription = await this.stripe.subscriptions.retrieve(
        currentSubscriptionId,
        {
          expand: ['items.data.price']
        }
      );

      if (currentSubscription.customer !== customerId) {
        throw new Error('Current subscription does not belong to this user');
      }

      if (!['active', 'trialing'].includes(currentSubscription.status)) {
        throw new Error(`Cannot upgrade subscription with status: ${currentSubscription.status}`);
      }

      const newPrice = await this.stripe.prices.retrieve(newPriceId);
      if (!newPrice.recurring) {
        throw new Error('Only recurring prices are supported for subscription upgrades');
      }

      const currentPriceId = currentSubscription.items.data[0].price.id;
      if (currentPriceId === newPriceId) {
        throw new Error('Customer is already subscribed to this price');
      }

      const currentQuantity = currentSubscription.items.data[0].quantity || 1;

      const updatedSubscription = await this.stripe.subscriptions.update(
        currentSubscriptionId,
        {
          items: [
            {
              id: currentSubscription.items.data[0].id,
              price: newPriceId,
              quantity: currentQuantity,
            },
          ],
          metadata: {
            ...currentSubscription.metadata,
            action: 'upgrade',
            upgradeDate: new Date().toISOString(),
            previousPriceId: currentPriceId,
            userId: userId,
          },
          proration_behavior: 'always_invoice',
        }
      );

      // Check if the update was successful
      if (updatedSubscription.items.data[0].price.id !== newPriceId) {
        throw new Error('Subscription update failed - price was not changed');
      }

      console.log(`✅ Subscription ${currentSubscriptionId} immediately upgraded for user ${userId}`);
      console.log(`   From: ${currentPriceId} → To: ${newPriceId}`);
      console.log(`   Status: ${updatedSubscription.status}`);

      return {
        subscription: updatedSubscription,
        success: true,
        message: 'Subscription upgraded successfully',
        details: {
          previousPriceId: currentPriceId,
          newPriceId: newPriceId,
          prorationCreated: true,
          immediatePayment: true
        }
      };

    } catch (error: any) {
      console.error('❌ Error upgrading subscription:', error);

      // More specific error handling
      if (error.type === 'StripeCardError') {
        throw new Error(`Payment failed: ${error.message}`);
      } else if (error.type === 'StripeInvalidRequestError') {
        throw new Error(`Invalid request: ${error.message}`);
      } else if (error.message?.includes('does not belong to this user')) {
        throw new Error('Unauthorized: Subscription does not belong to this user');
      }

      throw new Error(
        `Failed to upgrade subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleMeteredBilling(
    newUserId: string,
    priceId: string,
    subscriptionId: string,
  ) {
    try {
      // Retrieve the owner's subscription
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items'],
      });

      if (subscription.status !== 'active') {
        throw new Error(`Subscription is not active. Current status: ${subscription.status}`);
      }

      // Determine the billing interval from existing subscription items
      const baseItem = subscription.items.data[0];
      const billingInterval = baseItem.price.recurring?.interval;

      if (!priceId) {
        throw new Error(`No metered price configured for interval: ${billingInterval}`);
      }

      // Find existing metered item
      let meteredItem = subscription.items.data.find((item: any) =>
        item.price.id === priceId
      );

      // If metered item doesn't exist, add it to the subscription
      if (!meteredItem) {
        // console.log(`Adding metered item for ${billingInterval} billing to subscription...`);

        try {
          const newSubscriptionItem = await this.stripe.subscriptionItems.create({
            subscription: subscriptionId,
            price: priceId,
          });

          meteredItem = newSubscriptionItem;
        } catch (flexibleBillingError) {
          console.error('Error adding metered item to subscription:', flexibleBillingError);
          throw new Error(
            `Cannot add metered item to subscription. Please enable flexible billing mode or ensure all items have the same ${billingInterval} interval.`
          );
        }
      }
      // ✅ NEW: Record usage with meter events (instead of usage records)
      await this.stripe.billing.meterEvents.create({
        event_name: "team_workspace_additional_members", // must match your configured meter event in Stripe
        payload: {
          stripe_customer_id: subscription.customer as string,
          value: "1", // +1 additional user
          user_id: newUserId, // optional extra field for debugging
        },
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        newUserId: newUserId,
        billingInterval: billingInterval,
      };

    } catch (error) {
      console.error('Error handling metered billing:', error);
      throw new Error(
        `Failed to handle metered billing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async removeMeteredBilling(
    subscriptionId: string,
    customerId: string,
    deletedUserId: string,
    billingInterval: "month" | "year"
  ) {
    try {
      const amountInCents = billingInterval === "month" ? 800 : 9600;

      await this.stripe.invoiceItems.create({
        customer: customerId,
        amount: amountInCents,
        currency: "usd",
        description:
          billingInterval === "month"
            ? "Immediate adjustment for 1 monthly user removed"
            : "Immediate adjustment for 1 yearly user removed",
        subscription: subscriptionId,
      });

      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        subscription: subscriptionId,
        collection_method: "charge_automatically",
      });

      const finalized = await this.stripe.invoices.finalizeInvoice(invoice.id);

      const meterEvent = await this.stripe.billing.meterEvents.create({
        event_name: "team_workspace_additional_members",
        payload: {
          stripe_customer_id: customerId,
          value: "-1",
          user_id: deletedUserId,
        },
      });

      console.log('meterEvent', meterEvent);

      return finalized;
    } catch (error) {
      console.error("Error removing metered billing:", error);
      throw new Error(
        `Failed to remove metered billing: ${error instanceof Error ? error.message : "Unknown error"
        }`
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
