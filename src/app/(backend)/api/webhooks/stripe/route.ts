import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getStripeConfig } from '@/config/stripe';
import { db } from '@/database';
import { userSubscriptions, users } from '@/database/schemas';
import { CreditManager } from '@/server/services/credits/creditManager';
import { StripeCheckoutService } from '@/server/services/stripe/checkout';
import { PlanMapper } from '@/server/services/subscriptions/planMapper';
import { SubscriptionManager } from '@/server/services/subscriptions/subscriptionManager';

// Disable Next.js body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// GET method for manual subscription sync (for debugging and cleanup)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get('subscription_id');
  const userId = searchParams.get('user_id');
  const action = searchParams.get('action');
  const debug = searchParams.get('debug');

  // Handle cleanup of orphaned subscriptions
  if (action === 'cleanup') {
    try {
      const config = getStripeConfig();
      if (!config.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
      }

      const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
        apiVersion: config.STRIPE_API_VERSION as any,
      });

      const subscriptionManager = new SubscriptionManager();
      const result = await subscriptionManager.cleanupOrphanedSubscriptions(stripe);

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error cleaning up orphaned subscriptions:', error);
      return NextResponse.json(
        {
          error: 'Failed to cleanup orphaned subscriptions',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  }

  // Handle debug mode - show subscription details without syncing
  if (debug === 'true' && subscriptionId) {
    try {
      const config = getStripeConfig();
      if (!config.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
      }

      const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
        apiVersion: config.STRIPE_API_VERSION as any,
      });

      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const product = await stripe.products.retrieve(
        subscription.items.data[0].price.product as string,
      );

      // Get local subscription data
      const localSubscription = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      return NextResponse.json({
        stripe: {
          subscription: {
            id: subscription.id,
            status: subscription.status,
            customer: subscription.customer,
            metadata: subscription.metadata,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
          },
          product: {
            id: product.id,
            name: product.name,
            metadata: product.metadata,
          },
          price: {
            id: subscription.items.data[0].price.id,
            unit_amount: subscription.items.data[0].price.unit_amount,
            currency: subscription.items.data[0].price.currency,
          },
        },
        local: localSubscription[0] || null,
        planMapping: PlanMapper.getPlanFromStripeProduct(product),
      });
    } catch (error) {
      console.error('Error in debug mode:', error);
      return NextResponse.json(
        {
          error: 'Failed to get debug info',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  }

  // Handle individual subscription sync
  if (!subscriptionId || !userId) {
    return NextResponse.json(
      { error: 'Missing subscription_id or user_id parameter' },
      { status: 400 },
    );
  }

  try {
    const config = getStripeConfig();
    if (!config.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: config.STRIPE_API_VERSION as any,
    });

    const subscriptionManager = new SubscriptionManager();
    const result = await subscriptionManager.syncSubscriptionWithStripe(
      userId,
      subscriptionId,
      stripe,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Helper function to map Stripe subscription status to supported status values
function mapStripeStatus(
  status: Stripe.Subscription.Status,
):
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid' {
  switch (status) {
    case 'active':
    case 'trialing':
      return status;
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return status;
    case 'past_due':
    case 'unpaid':
      return status;
    case 'paused':
      // Treat paused subscriptions as active for now
      return 'active';
    default:
      // Default to incomplete for unknown statuses
      return 'incomplete';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
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

    const creditManager = new CreditManager();
    const checkoutService = new StripeCheckoutService();
    const subscriptionManager = new SubscriptionManager();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;

        if (!userId || !priceId) {
          console.error('Missing metadata in checkout session:', session.id);
          break;
        }

        try {
          if (session.mode === 'payment') {
            // Handle one-time credit purchase
            const creditsAmount = await checkoutService.getCreditsAmount(priceId);

            // Add credits to user balance
            await creditManager.addCredits(userId, creditsAmount, event.id, {
              priceId,
              productId: session.line_items?.data[0]?.price?.product as string,
              stripePaymentIntentId: session.payment_intent as string,
              currency: session.currency || 'usd',
            });

            console.log(`Credits added for user ${userId}: ${creditsAmount}`);
          } else if (session.mode === 'subscription') {
            // Handle subscription purchase
            console.log(`Subscription created for user ${userId}: ${session.subscription}`);

            // Get subscription details from Stripe
            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string,
              );
              const product = await stripe.products.retrieve(
                subscription.items.data[0].price.product as string,
              );

              // Map product to plan configuration
              const plan = PlanMapper.getPlanFromStripeProduct(product);
              if (plan) {
                await subscriptionManager.upsertSubscription(
                  userId,
                  subscription.id,
                  subscription.customer as string,
                  subscription.items.data[0].price.id,
                  plan,
                  mapStripeStatus(subscription.status),
                  new Date(subscription.current_period_start * 1000),
                  new Date(subscription.current_period_end * 1000),
                  subscription.cancel_at_period_end,
                  subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
                );
                console.log(
                  `Subscription ${subscription.id} created for user ${userId} with plan ${plan.name}`,
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
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`New subscription created: ${subscription.id}`);

        try {
          const product = await stripe.products.retrieve(
            subscription.items.data[0].price.product as string,
          );
          const plan = PlanMapper.getPlanFromStripeProduct(product);

          if (plan) {
            await subscriptionManager.upsertSubscription(
              subscription.metadata?.userId || 'unknown',
              subscription.id,
              subscription.customer as string,
              subscription.items.data[0].price.id,
              plan,
              mapStripeStatus(subscription.status),
              new Date(subscription.current_period_start * 1000),
              new Date(subscription.current_period_end * 1000),
              subscription.cancel_at_period_end,
              subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
            );
            console.log(`Subscription ${subscription.id} created with plan ${plan.name}`);
          }
        } catch (error) {
          console.error('Error processing subscription.created:', error);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription updated: ${subscription.id}`);

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
            break;
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

            await subscriptionManager.upsertSubscription(
              userId,
              subscription.id,
              subscription.customer as string,
              subscription.items.data[0].price.id,
              plan,
              mapStripeStatus(subscription.status),
              new Date(subscription.current_period_start * 1000),
              new Date(subscription.current_period_end * 1000),
              subscription.cancel_at_period_end,
              subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
            );

            console.log(
              `✅ Subscription ${subscription.id} updated with plan ${plan.name} for user ${userId}`,
            );
          } else {
            console.error(`❌ Could not map product ${product.id} to plan configuration`);
            console.error(`Product name: ${product.name}`);
            console.error(`Product metadata:`, product.metadata);

            // Try to get existing subscription to preserve current plan data
            const existingSubscription = await db
              .select()
              .from(userSubscriptions)
              .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id))
              .limit(1);

            if (existingSubscription.length > 0) {
              console.log(`Preserving existing plan data for subscription ${subscription.id}`);
              // Update only the status and billing period, keep existing plan details
              await subscriptionManager.upsertSubscription(
                userId,
                subscription.id,
                subscription.customer as string,
                subscription.items.data[0].price.id,
                {
                  id: existingSubscription[0].planId || 'unknown',
                  name: existingSubscription[0].planName || 'Unknown',
                  monthlyCredits: existingSubscription[0].monthlyCredits || 0,
                  fileStorageLimitGB: existingSubscription[0].fileStorageLimit || 1,
                  vectorStorageLimitMB: existingSubscription[0].vectorStorageLimit || 50,
                  price: existingSubscription[0].amount || 0,
                  interval: (existingSubscription[0].interval as 'month' | 'year') || 'month',
                },
                mapStripeStatus(subscription.status),
                new Date(subscription.current_period_start * 1000),
                new Date(subscription.current_period_end * 1000),
                subscription.cancel_at_period_end,
                subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
              );
              console.log(
                `✅ Subscription ${subscription.id} updated with existing plan data for user ${userId}`,
              );
            }
          }
        } catch (error) {
          console.error('❌ Error processing subscription.updated:', error);
          // Log additional context for debugging
          console.error('Subscription data:', {
            id: subscription.id,
            customer: subscription.customer,
            metadata: subscription.metadata,
            status: subscription.status,
            items: subscription.items?.data?.map((item) => ({
              price: item.price?.id,
              product: item.price?.product,
            })),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription cancelled: ${subscription.id}`);

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
            console.log(`Subscription ${subscription.id} completely removed for user ${userId}`);
          } else {
            console.error(`Could not find user for deleted subscription ${subscription.id}`);
          }
        } catch (error) {
          console.error('Error processing subscription.deleted:', error);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          console.log(`Subscription payment succeeded: ${invoice.subscription}`);

          try {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(
              invoice.subscription as string,
            );
            const userId = subscription.metadata?.userId;

            if (userId && subscription.status === 'active') {
              // Allocate monthly credits for the new billing period
              const result = await subscriptionManager.allocateMonthlyCredits(
                userId,
                subscription.id,
              );
              console.log(`Monthly credits allocated for user ${userId}: ${result.creditsAdded}`);
            }
          } catch (error) {
            console.error('Error processing invoice.payment_succeeded:', error);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          console.log(`Subscription payment failed: ${invoice.subscription}`);

          try {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(
              invoice.subscription as string,
            );
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
                new Date(subscription.current_period_start * 1000),
                new Date(subscription.current_period_end * 1000),
                subscription.cancel_at_period_end,
                subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
              );
              console.log(
                `Subscription ${subscription.id} marked as past_due due to payment failure`,
              );
            }
          } catch (error) {
            console.error('Error processing invoice.payment_failed:', error);
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;

        if (!charge.payment_intent) {
          console.log('Skipping charge without payment intent:', charge.id);
          break;
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

            console.log(`Credits refunded for user ${originalTransaction.userId}: ${refundAmount}`);
          }
        } catch (error) {
          console.error('Error processing charge.refunded:', error);
        }
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
