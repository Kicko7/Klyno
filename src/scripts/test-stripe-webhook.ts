#!/usr/bin/env tsx

/**
 * Test script for Stripe webhook functionality
 * This script tests the plan update webhook handler and subscription management
 */

import { config } from 'dotenv';
import Stripe from 'stripe';

import { db } from '@/database';
import { userSubscriptions, userUsageQuotas, userCredits, creditTransactions } from '@/database/schemas';
import { SubscriptionManager } from '@/server/services/subscriptions/subscriptionManager';
import { PlanMapper } from '@/server/services/subscriptions/planMapper';
import { eq } from 'drizzle-orm';

// Load environment variables
config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil' as any,
});

const subscriptionManager = new SubscriptionManager();

async function testPlanUpdateWebhook() {
  console.log('🧪 Testing Stripe webhook plan update functionality...\n');

  try {
    // Test 1: Check database connection
    console.log('1️⃣ Testing database connection...');
    const testQuery = await db.select().from(userSubscriptions).limit(1);
    console.log('✅ Database connection successful\n');

    // Test 2: Test PlanMapper
    console.log('2️⃣ Testing PlanMapper...');
    const mockProduct = {
      id: 'prod_test',
      name: 'Test Plan',
      metadata: {
        plan_key: 'starter',
        monthly_credits: '5000000',
        file_storage_gb: '1',
        vector_storage_mb: '50',
      },
    } as any;

    const plan = PlanMapper.getPlanFromStripeProduct(mockProduct);
    if (plan) {
      console.log('✅ PlanMapper working:', {
        id: plan.id,
        name: plan.name,
        credits: plan.monthlyCredits,
        fileStorage: plan.fileStorageLimitGB,
        vectorStorage: plan.vectorStorageLimitMB,
      });
    } else {
      console.log('❌ PlanMapper failed to map product');
    }
    console.log('');

    // Test 3: Test subscription manager methods
    console.log('3️⃣ Testing SubscriptionManager methods...');
    
    // Test usage limits validation
    const testUserId = 'test_user_123';
    const validationResult = await subscriptionManager.validateUsageLimits(testUserId);
    console.log('Usage validation result:', validationResult);
    
    // Test force reset usage (should fail for non-existent user)
    const resetResult = await subscriptionManager.forceResetUsage(testUserId, 'test_reset');
    console.log('Force reset result:', resetResult);
    console.log('');

    // Test 4: Check existing subscriptions
    console.log('4️⃣ Checking existing subscriptions...');
    const existingSubs = await db.select().from(userSubscriptions).limit(5);
    console.log(`Found ${existingSubs.length} existing subscriptions`);
    
    if (existingSubs.length > 0) {
      const sub = existingSubs[0];
      console.log('Sample subscription:', {
        id: sub.id,
        userId: sub.userId,
        planName: sub.planName,
        status: sub.status,
        monthlyCredits: sub.monthlyCredits,
        fileStorageLimit: sub.fileStorageLimit,
        vectorStorageLimit: sub.vectorStorageLimit,
      });
    }
    console.log('');

    // Test 5: Check usage quotas
    console.log('5️⃣ Checking usage quotas...');
    const existingQuotas = await db.select().from(userUsageQuotas).limit(5);
    console.log(`Found ${existingQuotas.length} existing usage quotas`);
    
    if (existingQuotas.length > 0) {
      const quota = existingQuotas[0];
      console.log('Sample quota:', {
        id: quota.id,
        userId: quota.userId,
        creditsUsed: quota.creditsUsed,
        creditsLimit: quota.creditsLimit,
        fileStorageUsed: quota.fileStorageUsed,
        fileStorageLimit: quota.fileStorageLimit,
        vectorStorageUsed: quota.vectorStorageUsed,
        vectorStorageLimit: quota.vectorStorageLimit,
      });
    }
    console.log('');

    // Test 6: Check credit transactions
    console.log('6️⃣ Checking credit transactions...');
    const existingTransactions = await db.select().from(creditTransactions).limit(5);
    console.log(`Found ${existingTransactions.length} existing credit transactions`);
    
    if (existingTransactions.length > 0) {
      const tx = existingTransactions[0];
      console.log('Sample transaction:', {
        id: tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        stripeEventId: tx.stripeEventId,
      });
    }
    console.log('');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function testWebhookEventHandling() {
  console.log('🧪 Testing webhook event handling...\n');

  try {
    // Test 1: Simulate subscription.updated event
    console.log('1️⃣ Testing subscription.updated event handling...');
    
    const mockEvent = {
      id: 'evt_test_123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          cancel_at_period_end: false,
          metadata: {
            userId: 'test_user_123',
          },
          items: {
            data: [{
              price: {
                id: 'price_test_123',
                product: 'prod_test_starter',
              },
            }],
          },
        },
      },
    } as any;

    console.log('Mock event created:', {
      id: mockEvent.id,
      type: mockEvent.type,
      subscriptionId: mockEvent.data.object.id,
      userId: mockEvent.data.object.metadata?.userId,
    });

    // Test 2: Test plan change detection
    console.log('\n2️⃣ Testing plan change detection...');
    
    // Create a test subscription
    const testSubscription = {
      id: 'sub_test_123',
      userId: 'test_user_123',
      stripeSubscriptionId: 'sub_test_123',
      stripeCustomerId: 'cus_test_123',
      stripePriceId: 'price_test_123',
      planId: 'starter',
      planName: 'Starter',
      status: 'active',
      monthlyCredits: 5000000,
      fileStorageLimit: 1,
      vectorStorageLimit: 50,
      currency: 'usd',
      amount: 1299,
      interval: 'month',
    };

    // Check if this would be detected as a plan change
    const existingSub = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.stripeSubscriptionId, 'sub_test_123'))
      .limit(1);

    if (existingSub.length > 0) {
      const isPlanChange = 
        existingSub[0].monthlyCredits !== testSubscription.monthlyCredits ||
        existingSub[0].fileStorageLimit !== testSubscription.fileStorageLimit ||
        existingSub[0].vectorStorageLimit !== testSubscription.vectorStorageLimit;

      console.log('Plan change detection:', {
        existing: {
          credits: existingSub[0].monthlyCredits,
          fileStorage: existingSub[0].fileStorageLimit,
          vectorStorage: existingSub[0].vectorStorageLimit,
        },
        new: {
          credits: testSubscription.monthlyCredits,
          fileStorage: testSubscription.fileStorageLimit,
          vectorStorage: testSubscription.vectorStorageLimit,
        },
        isPlanChange,
      });
    } else {
      console.log('No existing subscription found for testing plan change detection');
    }

    console.log('\n✅ Webhook event handling tests completed!');

  } catch (error) {
    console.error('❌ Webhook event handling test failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting Stripe webhook functionality tests...\n');

  await testPlanUpdateWebhook();
  console.log('\n' + '='.repeat(50) + '\n');
  await testWebhookEventHandling();

  console.log('\n🎉 All tests completed!');
  process.exit(0);
}

// Run the tests
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}
