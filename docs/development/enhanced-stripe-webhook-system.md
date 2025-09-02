# Enhanced Stripe Webhook System

## Overview

This document describes the enhanced Stripe webhook system that handles plan updates, usage quotas, and credit management for LobeChat subscriptions. The system provides comprehensive webhook processing with proper plan change detection, usage quota management, and credit allocation.

## Features

### ✅ **Plan Update Handling**

- **Automatic Plan Change Detection**: Compares existing subscription limits with new plan limits
- **Usage Quota Reset**: Automatically resets usage counters when plans change
- **Credit Reallocation**: Handles credit adjustments for plan upgrades/downgrades
- **Metadata Preservation**: Archives previous usage data with change history

### ✅ **Usage Quota Management**

- **Billing Period Tracking**: Tracks usage within subscription billing cycles
- **Storage Limits**: Enforces file storage (GB) and vector storage (MB) limits
- **Credit Limits**: Manages monthly credit allocation and usage
- **Usage History**: Maintains 30-day usage history for analytics

### ✅ **Credit Management**

- **Automatic Allocation**: Allocates credits on subscription creation and renewal
- **Plan Change Handling**: Adjusts credits when plans change
- **Transaction History**: Complete audit trail of all credit operations
- **Idempotency**: Prevents duplicate credit allocation via Stripe event IDs

### ✅ **Webhook Security**

- **Signature Verification**: All webhooks verified using Stripe signing secret
- **Event Deduplication**: Prevents duplicate processing of webhook events
- **Error Handling**: Comprehensive error handling with proper logging
- **Retry Logic**: Implements retry mechanisms for failed operations

## Database Schema

### Core Tables

#### `user_subscriptions`

```sql
CREATE TABLE "user_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "stripe_subscription_id" text UNIQUE,
  "stripe_customer_id" text,
  "stripe_price_id" text,
  "plan_id" text NOT NULL,
  "plan_name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'incomplete',
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false,
  "canceled_at" timestamp,
  "monthly_credits" integer NOT NULL DEFAULT 0,
  "file_storage_limit_gb" integer NOT NULL DEFAULT 1,
  "vector_storage_limit_mb" integer NOT NULL DEFAULT 50,
  "currency" text NOT NULL DEFAULT 'usd',
  "amount" integer,
  "interval" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

#### `user_usage_quotas`

```sql
CREATE TABLE "user_usage_quotas" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "credits_used" integer NOT NULL DEFAULT 0,
  "credits_limit" integer NOT NULL DEFAULT 0,
  "file_storage_used_mb" integer NOT NULL DEFAULT 0,
  "file_storage_limit_mb" integer NOT NULL DEFAULT 1024,
  "vector_storage_used_mb" integer NOT NULL DEFAULT 0,
  "vector_storage_limit_mb" integer NOT NULL DEFAULT 50,
  "last_usage_update" timestamp NOT NULL DEFAULT now(),
  "usage_history" jsonb,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

#### `credit_transactions`

```sql
CREATE TABLE "credit_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL CHECK (type IN ('purchase', 'refund', 'usage', 'subscription_allocation', 'subscription_renewal')),
  "amount" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'usd',
  "stripe_event_id" text UNIQUE,
  "stripe_payment_intent_id" text,
  "stripe_charge_id" text,
  "price_id" text,
  "product_id" text,
  "metadata" jsonb,
  "transaction_date" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

## Webhook Event Handling

### Supported Events

#### 1. `customer.subscription.updated`

**Purpose**: Handles plan changes, status updates, and billing cycle changes

**Process**:

1. **Plan Change Detection**: Compares existing limits with new plan limits
2. **Usage Quota Reset**: Archives current quota and creates new one with reset counters
3. **Credit Reallocation**: Allocates credits for the new plan if subscription is active
4. **Metadata Update**: Updates subscription with new plan details

**Key Features**:

- Automatic detection of plan upgrades/downgrades
- Usage counter reset for new billing period
- Credit adjustment based on new plan limits
- Complete audit trail of changes

#### 2. `customer.subscription.created`

**Purpose**: Handles new subscription creation

**Process**:

1. **Subscription Creation**: Creates subscription record in database
2. **Usage Quota Setup**: Initializes usage tracking for billing period
3. **Credit Allocation**: Allocates initial monthly credits
4. **Customer Linking**: Links Stripe customer ID to user

#### 3. `invoice.payment_succeeded`

**Purpose**: Handles monthly credit renewal

**Process**:

1. **Credit Allocation**: Allocates monthly credits for new billing period
2. **Usage Reset**: Resets usage counters for new period
3. **Transaction Recording**: Records credit allocation transaction

#### 4. `customer.subscription.deleted`

**Purpose**: Handles subscription cancellation

**Process**:

1. **Status Update**: Marks subscription as canceled
2. **Data Cleanup**: Removes usage quotas and related data
3. **Credit Preservation**: Preserves existing credits for user

## Plan Change Workflow

### 1. **Detection**

```typescript
const isPlanChange =
  existingSubscription.length > 0 &&
  (existingSubscription[0].monthlyCredits !== plan.monthlyCredits ||
    existingSubscription[0].fileStorageLimit !== plan.fileStorageLimitGB ||
    existingSubscription[0].vectorStorageLimit !== plan.vectorStorageLimitMB);
```

### 2. **Usage Quota Reset**

```typescript
// Archive current usage
await tx
  .update(userUsageQuotas)
  .set({
    periodEnd: new Date(),
    metadata: {
      archived_at: new Date().toISOString(),
      reason: 'plan_change',
      previous_plan_limits: {
        /* ... */
      },
    },
  })
  .where(eq(userUsageQuotas.id, currentQuota.id));

// Create new quota with reset counters
await tx.insert(userUsageQuotas).values({
  creditsUsed: 0,
  fileStorageUsed: 0,
  vectorStorageUsed: 0,
  // ... other fields
});
```

### 3. **Credit Reallocation**

```typescript
// Allocate credits for new plan
const result = await subscriptionManager.allocateMonthlyCredits(userId, subscriptionId, {
  isPlanChange: true,
  stripeEventId: event.id,
  planId: plan.id,
  planName: plan.name,
});
```

## Usage Tracking

### Real-time Updates

```typescript
await subscriptionManager.updateUsage({
  userId: 'user123',
  creditsUsed: 1000,
  fileStorageUsedMB: 50,
  vectorStorageUsedMB: 25,
});
```

### Usage Validation

```typescript
const validation = await subscriptionManager.validateUsageLimits(userId);
if (!validation.isValid) {
  console.log('Usage limits exceeded:', validation.details);
}
```

### Usage History

- **Daily Snapshots**: Tracks usage changes over time
- **30-day Retention**: Maintains recent usage history
- **Metadata**: Includes context for usage changes

## Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxx
STRIPE_API_VERSION=2025-07-30.basil

# Application Configuration
APP_URL=https://yourdomain.com
```

### Stripe Product Metadata

```json
{
  "billing_interval": "month",
  "file_storage_gb": "1",
  "monthly_credits": "5000000",
  "plan_key": "starter",
  "plan_name": "Starter Plan",
  "vector_storage_mb": "50"
}
```

## Testing

### Test Script

Run the comprehensive test script to verify functionality:

```bash
npm run tsx src/scripts/test-stripe-webhook.ts
```

### Test Scenarios

1. **Plan Upgrade**: Starter → Creator Pro
2. **Plan Downgrade**: Enterprise → Creator Pro
3. **Billing Renewal**: Monthly credit allocation
4. **Subscription Cancellation**: Status update and cleanup
5. **Usage Tracking**: Real-time quota updates

### Webhook Testing

Use Stripe CLI for local testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Monitoring and Debugging

### Logging

The system provides comprehensive logging for all operations:

- Plan change detection
- Usage quota operations
- Credit allocation
- Error handling

### Error Handling

- **Webhook Failures**: Logged but don't cause webhook retries
- **Database Errors**: Transaction rollback with error logging
- **Stripe API Errors**: Detailed error logging with context

### Performance

- **Database Indexes**: Optimized queries for subscription lookups
- **Transaction Management**: Efficient database operations
- **Idempotency**: Prevents duplicate processing

## Migration Guide

### 1. **Run Database Migration**

```bash
npm run db:migrate
```

### 2. **Verify Tables**

Check that all required tables exist:

- `user_subscriptions`
- `user_usage_quotas`
- `credit_transactions`
- `user_credits`

### 3. **Test Webhook Endpoint**

Verify webhook endpoint is accessible:

```bash
curl -X POST https://yourdomain.com/api/webhooks/stripe
```

### 4. **Monitor Logs**

Watch for successful webhook processing and any errors.

## Troubleshooting

### Common Issues

#### 1. **Webhook Signature Verification Failed**

- Check `STRIPE_WEBHOOK_SECRET` environment variable
- Verify webhook endpoint URL in Stripe Dashboard
- Ensure webhook secret matches between Stripe and your app

#### 2. **Plan Change Not Detected**

- Verify Stripe product metadata contains required fields
- Check PlanMapper configuration for plan mapping
- Review webhook logs for plan change detection

#### 3. **Usage Quota Not Reset**

- Check database migration status
- Verify `user_usage_quotas` table structure
- Review transaction logs for quota operations

#### 4. **Credits Not Allocated**

- Verify subscription status is 'active' or 'trialing'
- Check credit allocation transaction logs
- Ensure Stripe event ID is unique

### Debug Commands

```typescript
// Check subscription status
const subInfo = await subscriptionManager.getUserSubscriptionInfo(userId);

// Validate usage limits
const validation = await subscriptionManager.validateUsageLimits(userId);

// Force reset usage (admin only)
await subscriptionManager.forceResetUsage(userId, 'debug_reset');
```

## Future Enhancements

### Planned Features

1. **Usage Analytics**: Advanced usage reporting and insights
2. **Automated Alerts**: Notifications when approaching limits
3. **Usage Optimization**: Suggestions for reducing resource consumption
4. **Multi-tenant Support**: Organization-level subscription management

### API Extensions

1. **Usage API**: REST endpoints for usage data
2. **Admin API**: Administrative functions for subscription management
3. **Webhook Retry**: Automatic retry for failed webhook processing
4. **Event Streaming**: Real-time usage updates via WebSockets

## Support

For issues related to:

- **Webhook Processing**: Check server logs and Stripe Dashboard
- **Database Operations**: Verify migration status and table structure
- **Plan Configuration**: Review Stripe product metadata
- **General Setup**: Ensure all environment variables are configured

## References

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe Subscription API](https://stripe.com/docs/api/subscriptions)
- [Database Migration Guide](../database-schema.dbml)
- [API Documentation](../api/README.md)
