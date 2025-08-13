import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { getStripeConfig } from '@/config/stripe';
import { db } from '@/database';
import { users } from '@/database/schemas/user';

export class StripeCustomerService {
  private stripe: Stripe;

  constructor() {
    const config = getStripeConfig();
    if (!config.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required for StripeCustomerService');
    }

    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: config.STRIPE_API_VERSION as any,
    });
  }

  /**
   * Safely get or create a Stripe customer for a user
   * This method handles cases where the stripe_customer_id column might not exist yet
   */
  async getOrCreateCustomer(userId: string, email?: string): Promise<{
    customerId: string;
    isNew: boolean;
    updatedInDatabase: boolean;
  }> {
    try {
      // First try to get existing customer ID from database
      const user = await db
        .select({ stripeCustomerId: users.stripeCustomerId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user[0]?.stripeCustomerId) {
        return {
          customerId: user[0].stripeCustomerId,
          isNew: false,
          updatedInDatabase: true,
        };
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });

      // Try to update user with Stripe customer ID
      let updatedInDatabase = false;
      try {
        await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
        updatedInDatabase = true;
      } catch (updateError) {
        // If the column doesn't exist yet, log the error but continue
        // The customer was created in Stripe, so we can return the ID
        console.warn('Failed to update user with stripe_customer_id (column may not exist yet):', updateError);
        updatedInDatabase = false;
      }

      return {
        customerId: customer.id,
        isNew: true,
        updatedInDatabase,
      };
    } catch (error) {
      console.error('Error getting or creating Stripe customer:', error);
      throw new Error(`Failed to get or create Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get customer information from Stripe
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
        return null; // Customer not found
      }
      throw error;
    }
  }

  /**
   * Update customer information in Stripe
   */
  async updateCustomer(customerId: string, updates: Partial<Stripe.CustomerUpdateParams>): Promise<Stripe.Customer> {
    return await this.stripe.customers.update(customerId, updates);
  }

  /**
   * Delete a customer from Stripe (use with caution)
   */
  async deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    return await this.stripe.customers.del(customerId);
  }

  /**
   * List all customers for a user (useful for debugging)
   */
  async listCustomers(limit = 100): Promise<Stripe.Customer[]> {
    const customers = await this.stripe.customers.list({ limit });
    return customers.data;
  }

  /**
   * Search for customers by email
   */
  async searchCustomersByEmail(email: string): Promise<Stripe.Customer[]> {
    const customers = await this.stripe.customers.search({
      query: `email:'${email}'`,
    });
    return customers.data;
  }

  /**
   * Ensure a user has a Stripe customer ID in the database
   * This method should be called after running the migration
   */
  async ensureCustomerInDatabase(userId: string, customerId: string): Promise<boolean> {
    try {
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error('Failed to update user with stripe_customer_id:', error);
      return false;
    }
  }
}
