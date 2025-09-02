import { z } from 'zod';

import { getAppConfig } from '@/envs/app';
import { authedProcedure, publicProcedure, router } from '@/libs/trpc/lambda';
import { StripeService } from '@/server/services/stripe';
import { StripeCheckoutService } from '@/server/services/stripe/checkout';
import { StripeCustomerService } from '@/server/services/stripe/customer';

export const stripeRouter = router({
  test: publicProcedure.query(async () => {
    try {
      const stripeService = new StripeService();

      // Test basic Stripe connectivity
      if (stripeService['stripe']) {
        try {
          const account = await stripeService['stripe'].accounts.retrieve();
          return { success: true, message: 'Stripe connection successful', accountId: account.id };
        } catch (stripeError) {
          console.error('Stripe API error:', stripeError);
          return { success: false, message: 'Stripe API error', error: stripeError };
        }
      } else {
        return { success: false, message: 'Stripe not configured' };
      }
    } catch (error) {
      console.error('Error in test endpoint:', error);
      return { success: false, message: 'Service error', error: error };
    }
  }),

  getPlans: publicProcedure.query(async () => {
    try {
      const stripeService = new StripeService();
      const plans = await stripeService.getPlans();
      return plans;
    } catch (error) {
      console.error('Error in getPlans router:', error);
      return [];
    }
  }),

  getProducts: publicProcedure.query(async () => {
    try {
      const stripeService = new StripeService();
      const products = await stripeService.getProducts();
      return products;
    } catch (error) {
      console.error('Error in getProducts router:', error);
      return [];
    }
  }),

  createCheckoutSession: authedProcedure
    .input(
      z.object({
        priceId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const appConfig = getAppConfig();
        if (!appConfig.APP_URL) {
          throw new Error('APP_URL is required for checkout');
        }

        console.log(`Creating checkout session for price ID: ${input.priceId}`);

        const checkoutService = new StripeCheckoutService();

        const successUrl = `${appConfig.APP_URL}/pricing`;
        const cancelUrl = `${appConfig.APP_URL}/pricing`;

        // Use the auto-detection method
        const session = await checkoutService.createAutoCheckoutSession(
          ctx.userId,
          input.priceId,
          successUrl,
          cancelUrl,
        );

        console.log(`Checkout session created successfully: ${session.id}`);

        return {
          success: true,
          sessionId: session.id,
          url: session.url,
        };
      } catch (error) {
        console.error('Error creating checkout session:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to create checkout session',
        );
      }
    }),

  // Legacy endpoint for credit purchases only
  createCreditCheckoutSession: authedProcedure
    .input(
      z.object({
        priceId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const appConfig = getAppConfig();
        if (!appConfig.APP_URL) {
          throw new Error('APP_URL is required for checkout');
        }

        const checkoutService = new StripeCheckoutService();

        const successUrl = `${appConfig.APP_URL}/pricing`;
        const cancelUrl = `${appConfig.APP_URL}/pricing`;

        const session = await checkoutService.createCheckoutSession(
          ctx.userId,
          input.priceId,
          successUrl,
          cancelUrl,
        );

        return {
          success: true,
          sessionId: session.id,
          url: session.url,
        };
      } catch (error) {
        console.error('Error creating credit checkout session:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to create credit checkout session',
        );
      }
    }),

  // New endpoint specifically for subscription purchases
  createSubscriptionCheckoutSession: authedProcedure
    .input(
      z.object({
        priceId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const appConfig = getAppConfig();
        if (!appConfig.APP_URL) {
          throw new Error('APP_URL is required for checkout');
        }

        const checkoutService = new StripeCheckoutService();

        const successUrl = `${appConfig.APP_URL}/pricing`;
        const cancelUrl = `${appConfig.APP_URL}/pricing`;

        const session = await checkoutService.createSubscriptionCheckoutSession(
          ctx.userId,
          input.priceId,
          successUrl,
          cancelUrl,
        );

        return {
          success: true,
          sessionId: session.id,
          url: session.url,
        };
      } catch (error) {
        console.error('Error creating subscription checkout session:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to create subscription checkout session',
        );
      }
    }),

  // Create a Stripe Billing Portal session so users can manage their subscriptions
  createBillingPortalSession: authedProcedure.mutation(async ({ ctx }) => {
    try {
      const appConfig = getAppConfig();
      if (!appConfig.APP_URL) {
        throw new Error('APP_URL is required for billing portal');
      }

      const customerService = new StripeCustomerService();
      const checkoutService = new StripeCheckoutService();

      // Ensure stripe customer exists for this user
      const customerId = await checkoutService.getOrCreateCustomerId(ctx.userId);

      // Create billing portal session
      const stripe = (checkoutService as any).stripe as any;
      if (!stripe) throw new Error('Stripe not configured');

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appConfig.APP_URL}/pricing`,
      });

      return { success: true, url: session.url };
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to create billing portal session',
      );
    }
  }),

  upgradeSubscriptionImmediately: authedProcedure
    .input(z.object({
      currentSubscriptionId: z.string().min(1),
      newPriceId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const checkoutService = new StripeCheckoutService();
      return await checkoutService.upgradeSubscriptionImmediately(ctx.userId, input.currentSubscriptionId,input.newPriceId );
    }),


});
