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
 * Detects the type of subscription update based on previous attributes
 */
function detectSubscriptionUpdateType(
  subscription: Stripe.Subscription,
  previousAttributes: any
): {
  type: 'new_billing_period' | 'plan_change' | 'status_change' | 'cancellation' | 'reactivation' | 'other';
  details: Record<string, any>;
} {
  if (!previousAttributes) {
    return {
      type: 'other',
      details: { reason: 'No previous attributes available' }
    };
  }

  const details: Record<string, any> = {};

  // Check for new billing period (most common for monthly renewals)
  const currentPeriodStart = subscription.current_period_start;
  const previousPeriodStart = previousAttributes.current_period_start;

  if (currentPeriodStart !== previousPeriodStart) {
    details.billing_period_change = {
      previous_start: previousPeriodStart ? new Date(previousPeriodStart * 1000) : null,
      current_start: new Date(currentPeriodStart * 1000),
      is_new_month: true
    };
    return {
      type: 'new_billing_period',
      details
    };
  }

  // Check for cancellation changes FIRST (highest priority)
  const currentCancelAtPeriodEnd = subscription.cancel_at_period_end;
  const previousCancelAtPeriodEnd = previousAttributes.cancel_at_period_end;
  
  if (currentCancelAtPeriodEnd !== previousCancelAtPeriodEnd) {
    details.cancellation_change = {
      previous_cancel_at_period_end: previousCancelAtPeriodEnd,
      current_cancel_at_period_end: currentCancelAtPeriodEnd,
      was_cancelled_now: previousCancelAtPeriodEnd === false && currentCancelAtPeriodEnd === true,
      was_reactivated: previousCancelAtPeriodEnd === true && currentCancelAtPeriodEnd === false
    };
    
    // If user reactivated (cancelled the cancellation), treat as reactivation
    if (previousCancelAtPeriodEnd === true && currentCancelAtPeriodEnd === false) {
      return {
        type: 'reactivation',
        details
      };
    }
    
    return {
      type: 'cancellation',
      details
    };
  }

  // Check for status changes
  const currentStatus = subscription.status;
  const previousStatus = previousAttributes.status;
  
  if (currentStatus !== previousStatus) {
    details.status_change = {
      previous_status: previousStatus,
      current_status: currentStatus
    };
    
    if (previousStatus === 'canceled' && currentStatus === 'active') {
      return {
        type: 'reactivation',
        details
      };
    }
    
    return {
      type: 'status_change',
      details
    };
  }

  // Check for plan changes (only if no cancellation/status changes)
  const currentPriceId = subscription.items.data[0]?.price?.id;
  const previousPriceId = (previousAttributes as any)?.items?.data?.[0]?.price?.id;
  
  if (currentPriceId !== previousPriceId) {
    details.plan_change = {
      previous_price_id: previousPriceId,
      current_price_id: currentPriceId
    };
    return {
      type: 'plan_change',
      details
    };
  }

  // Check for other changes
  const changedFields = Object.keys(previousAttributes).filter(
    key => subscription[key as keyof Stripe.Subscription] !== previousAttributes[key as keyof typeof previousAttributes]
  );

  if (changedFields.length > 0) {
    details.other_changes = changedFields;
    return {
      type: 'other',
      details
    };
  }

  return {
    type: 'other',
    details: { reason: 'No significant changes detected' }
  };
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

    // Add webhook event deduplication check
    const webhookId = event.id;
    console.log(`🔄 Processing Stripe webhook: ${event.type} (ID: ${webhookId})`);

    const creditManager = new CreditManager();
    const subscriptionManager = new SubscriptionManager();

    // Handle different event types
    // console.log(event.type,event)
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log(`📋 Processing checkout.session.completed for event ${webhookId}`);
        await handleCheckoutSessionCompleted(event, stripe, creditManager, subscriptionManager);
        break;
      }

      case 'customer.subscription.updated': {
        console.log(`📝 Processing customer.subscription.updated for event ${webhookId}`, event);
        const subscription = event.data.object as Stripe.Subscription;
        const previousAttributes = event.data.previous_attributes;

        // Detect the type of subscription update
        const updateType = detectSubscriptionUpdateType(subscription, previousAttributes);
        console.log(`🔍 Detected update type: ${updateType.type}`, updateType.details);
        console.log(`🔍 Previous cancel_at_period_end: ${previousAttributes?.cancel_at_period_end}, Current: ${subscription.cancel_at_period_end}`);

        // Always pass the current cancel_at_period_end value
        console.log(`🔄 Subscription ${subscription.id} cancel_at_period_end: ${subscription.cancel_at_period_end}`);
        console.log(`🔄 Subscription billing interval: ${subscription.items.data[0]?.price?.recurring?.interval || 'unknown'}`);
        await handleSubscriptionUpdated(event, stripe, subscriptionManager, subscription.cancel_at_period_end, updateType);

        break;
      }

      case 'customer.subscription.deleted': {
        console.log(`🗑️ Processing customer.subscription.deleted for event ${webhookId}`);
        await handleSubscriptionDeleted(event, subscriptionManager);
        break;
      }

      case 'invoice.payment_succeeded': {
        console.log(`💰 Processing invoice.payment_succeeded for event ${webhookId}`);
        await handleInvoicePaymentSucceeded(event, stripe, subscriptionManager);
        break;
      }

      case 'invoice.payment_failed': {
        console.log(`❌ Processing invoice.payment_failed for event ${webhookId}`);
        await handleInvoicePaymentFailed(event, stripe, subscriptionManager);
        break;
      }

      case 'charge.refunded': {
        console.log(`↩️ Processing charge.refunded for event ${webhookId}`);
        await handleChargeRefunded(event, creditManager);
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type} (ID: ${webhookId})`);
    }

    console.log(`✅ Successfully processed webhook: ${event.type} (ID: ${webhookId})`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
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
        const item = subscription.items.data[0];

        // Full plan/price object
        const stripePlan = item.price;
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
            stripePlan
          );

          // For checkout.session.completed, we'll let customer.subscription.created handle credit allocation
          // to avoid duplicate allocation and race conditions
          // Add a small delay to ensure proper sequencing
          console.log(
            `⏳ Waiting for customer.subscription.created event to handle credit allocation...`,
          );

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
  console.log(
    `🆕 Processing new subscription: ${subscription.id} for customer: ${subscription.customer}`,
  );

  try {
    const product = await stripe.products.retrieve(
      subscription.items.data[0].price.product as string,
    );

    console.log(`📦 Product metadata for new subscription:`, product.metadata);

    const plan = PlanMapper.getPlanFromStripeProduct(product);

    // Resolve userId: prefer subscription metadata, fallback to customer lookup
    let resolvedUserId = subscription.metadata?.userId;
    if (!resolvedUserId) {
      console.log(
        `🔍 User ID not found in subscription metadata, looking up by customer ID: ${subscription.customer}`,
      );
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, subscription.customer as string))
        .limit(1);
      if (user.length > 0) {
        resolvedUserId = user[0].id;
        console.log(`✅ Found user by customer ID: ${resolvedUserId}`);
      } else {
        console.log(`❌ No user found for customer ID: ${subscription.customer}`);
      }
    } else {
      console.log(`✅ User ID found in subscription metadata: ${resolvedUserId}`);
    }

    if (!resolvedUserId) {
      console.error(
        `❌ Cannot process subscription ${subscription.id}: userId not found in metadata or by customer lookup`,
      );
      return;
    }

    if (plan) {
      console.log(`📋 Mapped to plan: ${plan.name} (${plan.monthlyCredits} credits)`);

      const currentPeriodStart = safeUnixToDate(subscription.current_period_start);
      const currentPeriodEnd = safeUnixToDate(subscription.current_period_end);
      const canceledAt = subscription.canceled_at
        ? safeUnixToDate(subscription.canceled_at)
        : undefined;

      console.log(`💾 Upserting subscription in database...`);
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
      console.log(`✅ Subscription upserted successfully`);

      // If subscription is active, allocate credits with retry logic and proper error handling
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        console.log(`💰 Subscription is ${subscription.status}, allocating initial credits...`);
        await allocateCreditsWithRetry(resolvedUserId, subscription.id, subscriptionManager, {
          subscriptionId: subscription.id,
          planId: plan.id,
          planName: plan.name,
          isPlanChange: false,
          stripeEventId: event.id,
        });
      } else {
        console.log(`⏸️ Subscription status is ${subscription.status}, skipping credit allocation`);
      }

      console.log(
        `✅ Subscription ${subscription.id} created for user ${resolvedUserId} with plan ${plan.name}`,
      );
    } else {
      console.error(`❌ Could not map product ${product.id} to plan configuration`);
    }
  } catch (error) {
    console.error('❌ Error processing customer.subscription.created:', error);
    // Don't return error response to avoid webhook retries
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(
  event: Stripe.Event,
  stripe: Stripe,
  subscriptionManager: SubscriptionManager,
  cancelAtPeriodEnd?: boolean,
  updateType?: {
    type: 'new_billing_period' | 'plan_change' | 'status_change' | 'cancellation' | 'reactivation' | 'other';
    details: Record<string, any>;
  }
) {
  const subscription = event.data.object as Stripe.Subscription;
  const previousAttributes = event.data.previous_attributes;

  // Use provided update type or detect it
  const detectedUpdateType = updateType || detectSubscriptionUpdateType(subscription, previousAttributes);
  console.log(`📝 Processing subscription update: ${subscription.id} (${detectedUpdateType.type})`);

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
      console.error(`❌ Could not find user for updated subscription ${subscription.id}`);
      return;
    }

    // Get the product details from the subscription (defensive against empty items)
    const firstItem = subscription.items.data[0];
    if (!firstItem || !firstItem.price?.product) {
      console.error(`❌ Subscription ${subscription.id} has no valid price/product item`);
      return;
    }
    const product = await stripe.products.retrieve(firstItem.price.product as string);

    console.log(`📦 Retrieved product for subscription update: ${product.id} (${product.name})`);
    console.log(`📋 Product metadata:`, product.metadata);

    // Map product to plan configuration
    const plan = PlanMapper.getPlanFromStripeProduct(product);

    if (subscription.latest_invoice) {
      const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);

      // If the invoice is manual, skip the update because it's a manual update for user delete from organization in team workspace p
      if (invoice.billing_reason === 'manual') {
        return;
      }
    }

    if ((event.data.previous_attributes as any)?.plan) {
      if ((event.data.previous_attributes as any)?.plan?.billing_scheme === 'per_unit') {
        return;
      }
    }

    console.log("event.data.previous_attributes", event.data.previous_attributes);

    if (plan) {
      console.log(
        `✅ Mapped to plan: ${plan.name} (${plan.monthlyCredits} credits, ${plan.fileStorageLimitGB}GB storage, ${plan.vectorStorageLimitMB}MB vector)`,
      );

      const currentPeriodStart = safeUnixToDate(subscription.current_period_start);
      const currentPeriodEnd = safeUnixToDate(subscription.current_period_end);
      const canceledAt = subscription.canceled_at
        ? safeUnixToDate(subscription.canceled_at)
        : undefined;

      // Check if this is a plan change by comparing with existing subscription
      const existingSubscription = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id))
        .limit(1);

      const isPlanChange =
        existingSubscription.length > 0 &&
        (existingSubscription[0].monthlyCredits !== plan.monthlyCredits ||
          existingSubscription[0].fileStorageLimit !== plan.fileStorageLimitGB ||
          existingSubscription[0].vectorStorageLimit !== plan.vectorStorageLimitMB);

      const stripePlan = firstItem.price;
      // Update subscription in database
      await subscriptionManager.upsertSubscription(
        userId,
        subscription.id,
        subscription.customer as string,
        firstItem.price.id,
        plan,
        mapStripeStatus(subscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        canceledAt,
        stripePlan,
        detectedUpdateType
      );

      // Handle different update types
      switch (detectedUpdateType.type) {
        case 'new_billing_period':
          console.log(`📅 New billing period detected for user ${userId}`);
          // For new billing periods, credits are typically allocated via invoice.payment_succeeded
          // This webhook mainly updates the subscription record
          break;

        case 'plan_change':
          console.log(`🔄 Plan change detected for user ${userId}`);
          // Plan changes are handled by the existing isPlanChange logic
          if (isPlanChange) {
            console.log(
              `🔄 Plan change confirmed for user ${userId}; skipped mid-cycle credit allocation to prevent balance inflation`,
            );
          }
          break;

        case 'status_change':
          console.log(`📊 Status change detected for user ${userId}: ${detectedUpdateType.details.status_change?.previous_status} → ${detectedUpdateType.details.status_change?.current_status}`);
          break;

        case 'cancellation':
          console.log(`❌ Cancellation change detected for user ${userId}`);
          console.log(`❌ Will set cancel_at_period_end to true and calculate canceledPeriodDate based on billing interval`);
          break;

        case 'reactivation':
          console.log(`🔄 Reactivation detected for user ${userId} - preserving existing balance and file storage`);
          console.log(`🔄 Will set cancel_at_period_end to false and clear canceledPeriodDate`);
          // Reactivation preserves existing balance and file storage - no special handling needed
          break;

        case 'other':
          console.log(`🔧 Other changes detected for user ${userId}:`, detectedUpdateType.details);
          break;
      }

      console.log(
        `✅ Subscription ${subscription.id} updated with plan ${plan.name} for user ${userId} (${detectedUpdateType.type})`,
      );
    } else {
      console.error(`❌ Could not map product ${product.id} to plan configuration`);
    }
  } catch (error) {
    console.error('❌ Error processing customer.subscription.updated:', error);
    // Don't return error response to avoid webhook retries
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
      // Reset usage so stale usage doesn't linger, then remove subscription
      await subscriptionManager.removeDeletedSubscription(userId, subscription.id);
      console.log(`✅ Subscription ${subscription.id} usage reset and removed for user ${userId}`);
    } else {
      console.error(`Could not find user for deleted subscription ${subscription.id}`);
    }
  } catch (error) {
    console.error('Error processing customer.subscription.deleted:', error);
    // Don't return error response to avoid webhook retries
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
      // Don't return error response to avoid webhook retries
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
      // Don't return error response to avoid webhook retries
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
    // Don't return error response to avoid webhook retries
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

/**
 * Allocate credits with retry logic to handle race conditions
 */
async function allocateCreditsWithRetry(
  userId: string,
  subscriptionId: string,
  subscriptionManager: SubscriptionManager,
  metadata: {
    subscriptionId?: string;
    planId?: string;
    planName?: string;
    isPlanChange?: boolean;
    stripeEventId?: string;
  },
) {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  console.log(`🔄 Starting credit allocation for user ${userId}, subscription ${subscriptionId}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📝 Attempting to allocate credits (attempt ${attempt}/${maxRetries}) for user ${userId}`,
      );

      const result = await subscriptionManager.allocateMonthlyCredits(
        userId,
        subscriptionId,
        metadata,
      );

      if (result.success) {
        console.log(
          `✅ Initial credits allocated for user ${userId}: ${result.creditsAdded} credits`,
        );
        return result;
      } else {
        console.log(`⚠️ Credit allocation returned success: false for user ${userId}`);
        return result;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️ Credit allocation attempt ${attempt} failed for user ${userId}: ${errorMessage}`,
      );

      if (attempt === maxRetries) {
        console.error(
          `❌ Failed to allocate credits after ${maxRetries} attempts for user ${userId}: ${errorMessage}`,
        );
        // Don't throw - this is not a critical failure for the webhook
        return {
          success: false,
          creditsAdded: 0,
          error: errorMessage,
          attempts: maxRetries,
        };
      }

      console.log(`⏳ Waiting ${retryDelay * attempt}ms before retry...`);
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
    }
  }

  // This should never be reached, but just in case
  return {
    success: false,
    creditsAdded: 0,
    error: 'Unexpected end of retry loop',
    attempts: maxRetries,
  };
}
