# Stripe Subscription Integration with Credit Usage and Quotas

## Overview

This document outlines the comprehensive Stripe webhook integration for managing subscriptions, credit usage, and usage quotas in LobeChat. The system handles both one-time credit purchases and recurring subscriptions with automatic credit allocation and usage tracking.

## Database Schema Changes

### New Tables Added

#### 1. `user_subscriptions`

Tracks user subscription status and billing cycles:

```sql
CREATE TABLE "user_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
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
  "file_storage_limit" integer NOT NULL DEFAULT 1,
  "vector_storage_limit" integer NOT NULL DEFAULT 50,
  "currency" text NOT NULL DEFAULT 'usd',
  "amount" integer,
  "interval" text,
  "metadata" jsonb,
  "accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**Key Fields:**

- `stripe_subscription_id`: Links to Stripe subscription
- `status`: Subscription lifecycle status (active, canceled, past_due, etc.)
- `monthly_credits`: Credits allocated per billing period
- `file_storage_limit`: File storage limit in GB
- `vector_storage_limit`: Vector storage limit in MB

#### 2. `user_usage_quotas`

Tracks current usage against subscription limits:

```sql
CREATE TABLE "user_usage_quotas" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
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
  "accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**Key Features:**

- Billing period-based usage tracking
- Historical usage data (last 30 days)
- Real-time quota enforcement

### Enhanced Tables

#### 3. `credit_transactions`

Extended to support subscription-related transactions:

```sql
-- Added new transaction types
"type" text CHECK (type IN ('purchase', 'refund', 'usage', 'subscription_allocation', 'subscription_renewal'))
```

**New Transaction Types:**

- `subscription_allocation`: Monthly credit allocation
- `subscription_renewal`: Subscription renewal credits

## Stripe Webhook Integration

### Supported Events

#### 1. `checkout.session.completed`

Handles both one-time purchases and subscription creation:

**One-time Credit Purchase:**

- Adds credits to user balance immediately
- Records transaction in `credit_transactions`

**Subscription Creation:**

- Creates/updates `user_subscriptions` record
- Sets up usage quotas for billing period
- Links Stripe customer ID to user

#### 2. `customer.subscription.created`

- Creates new subscription record
- Maps Stripe product metadata to plan configuration
- Sets up initial usage quotas

#### 3. `customer.subscription.updated`

- Updates subscription status and plan details
- Handles plan upgrades/downgrades
- Updates usage limits accordingly

#### 4. `customer.subscription.deleted`

- Marks subscription as canceled
- Preserves usage history for billing purposes

#### 5. `invoice.payment_succeeded`

- Allocates monthly credits for active subscriptions
- Records credit allocation transaction
- Resets usage counters for new billing period

#### 6. `invoice.payment_failed`

- Updates subscription status to `past_due`
- Triggers payment failure handling
- May suspend certain features

#### 7. `charge.refunded`

- Processes credit refunds
- Updates user balance
- Records refund transaction

### Plan Configuration

#### Stripe Product Metadata Requirements

Configure your Stripe products with these metadata fields:

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

#### Supported Plans

| Plan        | Monthly Credits | File Storage | Vector Storage | Monthly Price |
| ----------- | --------------- | ------------ | -------------- | ------------- |
| Starter     | 5,000,000       | 1 GB         | 50 MB          | $12.99        |
| Creator Pro | 15,000,000      | 3 GB         | 150 MB         | $29.99        |
| Enterprise  | 50,000,000      | 10 GB        | 500 MB         | $99.99        |

## Usage Tracking and Quota Enforcement

### Credit Usage Tracking

1. **Real-time Tracking**: Credits are deducted as users interact with AI models
2. **Period-based Limits**: Monthly credit limits reset each billing cycle
3. **Transaction History**: Complete audit trail of all credit operations

### Storage Usage Tracking

1. **File Storage**: Tracks uploaded file sizes in MB
2. **Vector Storage**: Monitors vector database usage
3. **Automatic Enforcement**: Prevents exceeding subscription limits

### Usage Quota Management

```typescript
// Example usage tracking
const usageTracker = new UsageTracker();
await usageTracker.updateUsage({
  userId: 'user123',
  creditsUsed: 1000,
  fileStorageUsedMB: 50,
  vectorStorageUsedMB: 25,
});
```

## Services Architecture

### 1. SubscriptionManager

- Manages subscription lifecycle
- Handles credit allocation
- Updates usage quotas

### 2. PlanMapper

- Maps Stripe products to plan configurations
- Supports custom plan metadata
- Fallback plan detection

### 3. UsageTracker

- Real-time usage monitoring
- Quota enforcement
- Usage history management

### 4. CreditManager

- Credit balance operations
- Transaction recording
- Refund processing

## Database Migration

Run the migration to create new tables:

```bash
npm run db:migrate
```

The migration file `0044_add_subscription_tables.ts` will:

- Create `user_subscriptions` table
- Create `user_usage_quotas` table
- Add necessary indexes and constraints
- Set up foreign key relationships

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

### Stripe Dashboard Setup

1. **Webhook Endpoint**: `https://yourdomain.com/api/webhooks/stripe`
2. **Required Events**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `charge.refunded`

## Testing

### Webhook Testing

Use Stripe CLI for local testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Test Scenarios

1. **Subscription Creation**: Create subscription → Verify credits allocated
2. **Monthly Renewal**: Simulate invoice payment → Check credit allocation
3. **Plan Upgrade**: Change subscription → Verify limits updated
4. **Payment Failure**: Simulate failed payment → Check status change
5. **Cancellation**: Cancel subscription → Verify status update

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Webhook Success Rate**: Ensure reliable event processing
2. **Credit Allocation**: Track monthly credit distribution
3. **Usage Patterns**: Monitor user consumption trends
4. **Payment Failures**: Alert on subscription issues

### Error Handling

- Webhook signature verification
- Idempotent operations (prevents duplicate processing)
- Comprehensive error logging
- Graceful degradation on failures

## Security Considerations

1. **Webhook Verification**: All webhooks verified with Stripe signing secret
2. **Database Transactions**: Atomic operations prevent data inconsistency
3. **User Isolation**: Users can only access their own data
4. **Audit Trail**: Complete transaction history for compliance

## Future Enhancements

1. **Usage Analytics**: Advanced reporting and insights
2. **Automated Billing**: Pro-rated charges for plan changes
3. **Usage Notifications**: Alert users approaching limits
4. **Plan Recommendations**: AI-powered plan suggestions
5. **Bulk Operations**: Enterprise customer management tools

## Troubleshooting

### Common Issues

1. **Webhook Failures**: Check signature verification and endpoint URL
2. **Missing Credits**: Verify subscription status and billing cycle
3. **Usage Not Tracking**: Check user subscription and quota setup
4. **Plan Mismatch**: Verify Stripe product metadata configuration

### Debug Tools

- Stripe Dashboard webhook logs
- Application logs with detailed error messages
- Database queries to verify data consistency
- Stripe CLI for local testing

## Support

For issues or questions:

1. Check Stripe Dashboard webhook logs
2. Review application error logs
3. Verify database schema and data
4. Test with Stripe CLI locally
5. Contact development team with specific error details
