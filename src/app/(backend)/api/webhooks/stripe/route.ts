import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getStripeConfig } from '@/config/stripe';
import { db } from '@/database';
import { userSubscriptions, users } from '@/database/schemas';
import { CreditManager } from '@/server/services/credits/creditManager';
import { PlanMapper } from '@/server/services/subscriptions/planMapper';
import { SubscriptionManager } from '@/server/services/subscriptions/subscriptionManager';

// Disable Next.js body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Maps Stripe subscription status to our internal status
 */
function mapStripeStatus(
  stripeStatus: string,
):
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return stripeStatus;
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return stripeStatus;
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    default:
      return 'incomplete';
  }
}

/**
 * Safely converts Unix timestamp to Date
 */
function safeUnixToDate(timestamp: number | null | undefined): Date {
  if (!timestamp) return new Date();
  const date = new Date(timestamp * 1000);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Stripe webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const config = getStripeConfig();
    if (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET) {
      console.error('Missing Stripe configuration');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: config.STRIPE_API_VERSION as any,
    });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, config.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`Processing Stripe webhook: ${event.type}`);

    const creditManager = new CreditManager();
    const subscriptionManager = new SubscriptionManager();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutSessionCompleted(event, stripe, creditManager, subscriptionManager);
        break;
      }

      case 'customer.subscription.created': {
        await handleSubscriptionCreated(event, stripe, subscriptionManager);
        break;
      }

      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event, stripe, subscriptionManager);
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event, subscriptionManager);
        break;
      }

      case 'invoice.payment_succeeded': {
        await handleInvoicePaymentSucceeded(event, stripe, subscriptionManager);
        break;
      }

      case 'invoice.payment_failed': {
        await handleInvoicePaymentFailed(event, stripe, subscriptionManager);
        break;
      }

      case 'charge.refunded': {
        await handleChargeRefunded(event, creditManager);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  stripe: Stripe,
  creditManager: CreditManager,
  subscriptionManager: SubscriptionManager,
) {
  const session = event.data.object as Stripe.Checkout.Session;
  console.log(`Processing checkout session: ${session.id}`);

  const userId = session.metadata?.userId;
  const priceId = session.metadata?.priceId;

  if (!userId || !priceId) {
    console.error('Missing metadata in checkout session:', {
      sessionId: session.id,
      metadata: session.metadata,
    });
    return;
  }

  try {
    if (session.mode === 'payment') {
      // Handle one-time credit purchase
      console.log(`Processing one-time payment for user ${userId}`);

      // Get credits amount from price (you may need to implement this based on your pricing structure)
      const creditsAmount = await getCreditsAmountFromPrice(priceId, stripe);

      // Add credits to user balance
      await creditManager.addCredits(userId, creditsAmount, event.id, {
        priceId,
        productId: session.line_items?.data[0]?.price?.product as string,
        stripePaymentIntentId: session.payment_intent as string,
        currency: session.currency || 'usd',
      });

      console.log(`✅ Credits added for user ${userId}: ${creditsAmount}`);
    } else if (session.mode === 'subscription') {
      // Handle subscription creation
      console.log(`Processing subscription creation for user ${userId}`);

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const product = await stripe.products.retrieve(
          subscription.items.data[0].price.product as string,
        );

        console.log(`Product metadata for subscription:`, product.metadata);

        // Map product to plan configuration
        const plan = PlanMapper.getPlanFromStripeProduct(product);
        if (plan) {
          console.log(`Mapped to plan: ${plan.name} (${plan.monthlyCredits} credits)`);

          const currentPeriodStart = safeUnixToDate(subscription.current_period_start);
          const currentPeriodEnd = safeUnixToDate(subscription.current_period_end);
          const canceledAt = subscription.canceled_at
            ? safeUnixToDate(subscription.canceled_at)
            : undefined;

          await subscriptionManager.upsertSubscription(
            userId,
            subscription.id,
            subscription.customer as string,
            subscription.items.data[0].price.id,
            plan,
            mapStripeStatus(subscription.status),
            currentPeriodStart,
            currentPeriodEnd,
            subscription.cancel_at_period_end,
            canceledAt,
          );

          // If subscription is active, allocate credits immediately
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            try {
              const result = await subscriptionManager.allocateMonthlyCredits(
                userId,
                subscription.id,
              );
              console.log(
                `✅ Initial credits allocated for user ${userId}: ${result.creditsAdded}`,
              );
            } catch (creditError) {
              console.error('Error allocating initial credits:', creditError);
            }
          }

          console.log(
            `✅ Subscription ${subscription.id} created for user ${userId} with plan ${plan.name}`,
          );
        } else {
          console.error(`Could not map product ${product.id} to plan configuration`);
        }
      }
    }
  } catch (error) {
    console.error('Error processing checkout.session.completed:', error);
    // Don't return error response to avoid webhook retries
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(
  event: Stripe.Event,
  stripe: Stripe,
  subscriptionManager: SubscriptionManager,
) {
  const subscription = event.data.object as Stripe.Subscription;
  console.log(`Processing new subscription: ${subscription.id}`);

  try {
    const product = await stripe.products.retrieve(
      subscription.items.data[0].price.product as string,
    );

    console.log(`Product metadata for new subscription:`, product.metadata);

    const plan = PlanMapper.getPlanFromStripeProduct(product);

    // Resolve userId: prefer subscription metadata, fallback to customer lookup
    let resolvedUserId = subscription.metadata?.userId;
    if (!resolvedUserId) {
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, subscription.customer as string))
        .limit(1);
      if (user.length > 0) resolvedUserId = user[0].id;
    }

    if (!resolvedUserId) {
      console.error(
        `Cannot process subscription ${subscription.id}: userId not found in metadata or by customer lookup`,
      );
      return;
    }

    if (plan) {
      console.log(`Mapped to plan: ${plan.name} (${plan.monthlyCredits} credits)`);

      const currentPeriodStart = safeUnixToDate(subscription.current_period_start);
      const currentPeriodEnd = safeUnixToDate(subscription.current_period_end);
      const canceledAt = subscription.canceled_at
        ? safeUnixToDate(subscription.canceled_at)
        : undefined;

      await subscriptionManager.upsertSubscription(
        resolvedUserId,
        subscription.id,
        subscription.customer as string,
        subscription.items.data[0].price.id,
        plan,
        mapStripeStatus(subscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        subscription.cancel_at_period_end,
        canceledAt,
      );

      // If subscription is active, allocate credits immediately
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        try {
          const result = await subscriptionManager.allocateMonthlyCredits(
            resolvedUserId,
            subscription.id,
          );
          console.log(
            `✅ Initial credits allocated for user ${resolvedUserId}: ${result.creditsAdded}`,
          );
        } catch (creditError) {
          console.error('Error allocating initial credits:', creditError);
        }
      }

      console.log(
        `✅ Subscription ${subscription.id} created for user ${resolvedUserId} with plan ${plan.name}`,
      );
    } else {
      console.error(`Could not map product ${product.id} to plan configuration`);
    }
  } catch (error) {
    console.error('Error processing customer.subscription.created:', error);
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(
  event: Stripe.Event,
  stripe: Stripe,
  subscriptionManager: SubscriptionManager,
) {
  const subscription = event.data.object as Stripe.Subscription;
  console.log(`Processing subscription update: ${subscription.id}`);

  try {
    // Get the user ID from subscription metadata or find it by customer ID
    let userId = subscription.metadata?.userId;

    if (!userId) {
      // Try to find user by Stripe customer ID
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, subscription.customer as string))
        .limit(1);

      if (user.length > 0) {
        userId = user[0].id;
      }
    }

    if (!userId) {
      console.error(`Could not find user for updated subscription ${subscription.id}`);
      return;
    }

    // Get the product details from the subscription
    const product = await stripe.products.retrieve(
      subscription.items.data[0].price.product as string,
    );

    console.log(`Retrieved product for subscription update: ${product.id} (${product.name})`);
    console.log(`Product metadata:`, product.metadata);

    // Map product to plan configuration
    const plan = PlanMapper.getPlanFromStripeProduct(product);

    if (plan) {
      console.log(
        `Mapped to plan: ${plan.name} (${plan.monthlyCredits} credits, ${plan.fileStorageLimitGB}GB storage)`,
      );

      const currentPeriodStart = safeUnixToDate(subscription.current_period_start);
      const currentPeriodEnd = safeUnixToDate(subscription.current_period_end);
      const canceledAt = subscription.canceled_at
        ? safeUnixToDate(subscription.canceled_at)
        : undefined;

      await subscriptionManager.upsertSubscription(
        userId,
        subscription.id,
        subscription.customer as string,
        subscription.items.data[0].price.id,
        plan,
        mapStripeStatus(subscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        subscription.cancel_at_period_end,
        canceledAt,
      );

      console.log(
        `✅ Subscription ${subscription.id} updated with plan ${plan.name} for user ${userId}`,
      );
    } else {
      console.error(`Could not map product ${product.id} to plan configuration`);
    }
  } catch (error) {
    console.error('Error processing customer.subscription.updated:', error);
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(
  event: Stripe.Event,
  subscriptionManager: SubscriptionManager,
) {
  const subscription = event.data.object as Stripe.Subscription;
  console.log(`Processing subscription deletion: ${subscription.id}`);

  try {
    // Get the user ID from subscription metadata or find it by customer ID
    let userId = subscription.metadata?.userId;

    if (!userId) {
      // Try to find user by Stripe customer ID
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, subscription.customer as string))
        .limit(1);

      if (user.length > 0) {
        userId = user[0].id;
      }
    }

    if (userId) {
      // Completely remove the deleted subscription and clean up related data
      await subscriptionManager.removeDeletedSubscription(userId, subscription.id);
      console.log(`✅ Subscription ${subscription.id} completely removed for user ${userId}`);
    } else {
      console.error(`Could not find user for deleted subscription ${subscription.id}`);
    }
  } catch (error) {
    console.error('Error processing customer.subscription.deleted:', error);
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(
  event: Stripe.Event,
  stripe: Stripe,
  subscriptionManager: SubscriptionManager,
) {
  const invoice = event.data.object as Stripe.Invoice;
  if (invoice.subscription) {
    console.log(`Processing subscription payment succeeded: ${invoice.subscription}`);

    try {
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

      // Try to get user ID from subscription metadata first
      let userId = subscription.metadata?.userId;

      // If not in metadata, try to find user by Stripe customer ID
      if (!userId) {
        const user = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, subscription.customer as string))
          .limit(1);

        if (user.length > 0) {
          userId = user[0].id;
        }
      }

      if (userId && subscription.status === 'active') {
        console.log(
          `Allocating monthly credits for user ${userId}, subscription ${subscription.id}`,
        );

        // Allocate monthly credits for the new billing period (idempotent via invoice.id)
        const result = await subscriptionManager.allocateMonthlyCredits(userId, subscription.id, {
          stripeEventId: invoice.id,
        });
        console.log(`✅ Monthly credits allocated for user ${userId}: ${result.creditsAdded}`);
      } else {
        console.log(
          `Skipping credit allocation - userId: ${userId}, status: ${subscription.status}`,
        );
      }
    } catch (error) {
      console.error('Error processing invoice.payment_succeeded:', error);
    }
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  stripe: Stripe,
  subscriptionManager: SubscriptionManager,
) {
  const invoice = event.data.object as Stripe.Invoice;
  if (invoice.subscription) {
    console.log(`Processing subscription payment failed: ${invoice.subscription}`);

    try {
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const userId = subscription.metadata?.userId;

      if (userId) {
        // Update subscription status to past_due
        await subscriptionManager.upsertSubscription(
          userId,
          subscription.id,
          subscription.customer as string,
          subscription.items.data[0].price.id,
          {
            id: 'unknown',
            name: 'Unknown',
            monthlyCredits: 0,
            fileStorageLimitGB: 1,
            vectorStorageLimitMB: 50,
            price: 0,
            interval: 'month',
          },
          'past_due',
          safeUnixToDate(subscription.current_period_start),
          safeUnixToDate(subscription.current_period_end),
          subscription.cancel_at_period_end,
          subscription.canceled_at ? safeUnixToDate(subscription.canceled_at) : undefined,
        );
        console.log(`✅ Subscription ${subscription.id} marked as past_due due to payment failure`);
      }
    } catch (error) {
      console.error('Error processing invoice.payment_failed:', error);
    }
  }
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(event: Stripe.Event, creditManager: CreditManager) {
  const charge = event.data.object as Stripe.Charge;

  if (!charge.payment_intent) {
    console.log('Skipping charge without payment intent:', charge.id);
    return;
  }

  try {
    // Find the original purchase transaction
    const originalTransaction = await creditManager.findTransactionByPaymentIntent(
      charge.payment_intent as string,
    );

    if (originalTransaction) {
      // Calculate refund amount (assuming full refund for simplicity)
      const refundAmount = Math.abs(originalTransaction.amount);

      await creditManager.refundCredits(originalTransaction.userId, refundAmount, event.id, {
        stripePaymentIntentId: charge.payment_intent as string,
        stripeChargeId: charge.id,
        currency: charge.currency,
      });

      console.log(`✅ Credits refunded for user ${originalTransaction.userId}: ${refundAmount}`);
    }
  } catch (error) {
    console.error('Error processing charge.refunded:', error);
  }
}

/**
 * Helper function to get credits amount from price
 * This is a placeholder - implement based on your pricing structure
 */
async function getCreditsAmountFromPrice(priceId: string, stripe: Stripe): Promise<number> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    // You can implement your own logic here to map price to credits
    // For now, returning a default value
    return 1000; // Default credits amount
  } catch (error) {
    console.error('Error retrieving price:', error);
    return 1000; // Default fallback
  }
}
