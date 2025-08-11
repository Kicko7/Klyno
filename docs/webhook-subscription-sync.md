# Webhook Subscription Sync & Cleanup

This document explains how to handle subscription synchronization issues when subscriptions are deleted from Stripe but still appear in the UI.

## Problem Description

When a subscription is deleted from the Stripe Dashboard, the webhook `customer.subscription.deleted` should be sent to your application. However, sometimes:

1. **Webhook delivery fails** - Network issues, server downtime, etc.
2. **Webhook processing fails** - Database errors, service unavailability
3. **Webhook not configured** - Missing webhook endpoint in Stripe
4. **Manual deletion** - Subscription deleted directly in Stripe without webhook

This results in **orphaned subscriptions** - subscriptions that exist in your database but not in Stripe.

## Solution: Enhanced Webhook Handling

### 1. Improved `customer.subscription.deleted` Webhook

The webhook now properly handles subscription deletion:

```typescript
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription;

  // Get user ID from metadata or find by customer ID
  let userId = subscription.metadata?.userId;

  if (!userId) {
    // Fallback: find user by Stripe customer ID
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
    // Completely remove subscription and clean up related data
    await subscriptionManager.removeDeletedSubscription(userId, subscription.id);
  }
}
```

### 2. Enhanced `customer.subscription.updated` Webhook

The webhook now properly handles plan updates with improved user ID resolution and error handling:

```typescript
case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription;

  // Get user ID from metadata or find it by customer ID
  let userId = subscription.metadata?.userId;

  if (!userId) {
    // Fallback: find user by Stripe customer ID
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
    // Get product details and map to plan
    const product = await stripe.products.retrieve(
      subscription.items.data[0].price.product as string,
    );
    const plan = PlanMapper.getPlanFromStripeProduct(product);

    if (plan) {
      // Update subscription with new plan
      await subscriptionManager.upsertSubscription(/* plan data */);
    } else {
      // Fallback: preserve existing plan data
      await subscriptionManager.upsertSubscription(/* existing plan data */);
    }
  }
}
```

### 3. New `removeDeletedSubscription` Method

This method completely removes the subscription and cleans up:

- Removes subscription record from `user_subscriptions`
- Removes usage quotas from `user_usage_quotas`
- Uses database transactions for data consistency

### 4. Manual Sync Endpoints

#### Sync Individual Subscription

```bash
GET /api/webhooks/stripe?subscription_id=sub_xxx &
user_id=user_xxx
```

This endpoint:

- Checks if subscription exists in Stripe
- Updates status if it exists
- Removes it if it doesn't exist in Stripe

#### Cleanup All Orphaned Subscriptions

```bash
GET /api/webhooks/stripe?action=cleanup
```

This endpoint:

- Scans all subscriptions in your database
- Checks each one against Stripe
- Removes orphaned subscriptions automatically

#### Debug Subscription Details

```bash
GET /api/webhooks/stripe?subscription_id=sub_xxx &
debug=true
```

This endpoint provides detailed information for debugging:

- Stripe subscription details
- Product information and metadata
- Local database subscription data
- Plan mapping results

## Usage Examples

### Immediate Cleanup

If you have a specific subscription that needs cleanup:

```bash
# Replace with actual IDs
curl "https://yourdomain.com/api/webhooks/stripe?subscription_id=sub_123&user_id=user_456"
```

### Bulk Cleanup

To clean up all orphaned subscriptions:

```bash
curl "https://yourdomain.com/api/webhooks/stripe?action=cleanup"
```

### Debug Subscription Issues

To debug why a subscription update isn't working:

```bash
curl "https://yourdomain.com/api/webhooks/stripe?subscription_id=sub_123&debug=true"
```

### Using the Cleanup Script

Run the provided script to check Stripe subscriptions:

```bash
# Install dependencies if needed
npm install dotenv

# Run the script
npx tsx scripts/cleanup-orphaned-subscriptions.ts
```

### Using the Test Script

Run the test script to debug subscription updates:

```bash
npx tsx scripts/test-subscription-update.ts
```

## Webhook Configuration

Ensure your Stripe webhook endpoint is properly configured:

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint**: `https://yourdomain.com/api/webhooks/stripe`
3. **Select events**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated` ⭐ **Important for plan updates**
   - `customer.subscription.deleted` ⭐ **Important**
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `charge.refunded`

## Monitoring & Debugging

### Check Webhook Delivery

1. **Stripe Dashboard** → Developers → Webhooks → Select endpoint
2. **View webhook attempts** and delivery status
3. **Check response codes** - should be 200 for success

### Check Application Logs

Look for these log messages:

```
✅ Subscription sub_123 completely removed for user user_456
✅ Subscription sub_123 updated with plan Creator Pro for user user_456
✅ Subscription sub_123 synced with Stripe
❌ Error processing subscription.updated: [error details]
```

### Debug Subscription Updates

When a plan update isn't working:

1. **Check webhook delivery** in Stripe Dashboard
2. **Use debug endpoint** to see subscription details
3. **Check application logs** for detailed error messages
4. **Verify product metadata** has correct `plan_key`

### Database Verification

Query your database to check subscription status:

```sql
-- Check all subscriptions
SELECT id, stripe_subscription_id, status, user_id, plan_name, monthly_credits
FROM user_subscriptions;

-- Check for specific subscription
SELECT * FROM user_subscriptions
WHERE stripe_subscription_id = 'sub_123';
```

## Common Issues & Solutions

### 1. Plan Update Not Working

**Symptoms**: Webhook returns 200 but plan doesn't change in database

**Causes**:

- Missing `userId` in subscription metadata
- Product metadata doesn't contain `plan_key`
- Plan mapping fails

**Solutions**:

- Use debug endpoint to check subscription details
- Verify product metadata in Stripe Dashboard
- Check application logs for plan mapping errors

### 2. User ID Not Found

**Symptoms**: "Could not find user for updated subscription" error

**Causes**:

- `userId` not in subscription metadata
- User not linked to Stripe customer ID

**Solutions**:

- Check subscription metadata in Stripe
- Verify user has `stripe_customer_id` in database
- Use fallback user ID resolution

### 3. Plan Mapping Fails

**Symptoms**: "Could not map product to plan configuration" error

**Causes**:

- Product metadata missing `plan_key`
- Product name doesn't match expected patterns
- Custom plan metadata incomplete

**Solutions**:

- Add `plan_key` to product metadata in Stripe
- Use standard product naming conventions
- Ensure all required metadata fields are present

## Prevention Strategies

### 1. Webhook Retry Configuration

Configure Stripe webhook retries:

- **Retry failed webhooks** automatically
- **Set appropriate timeout** (30 seconds recommended)
- **Monitor failure rates** and alert on high failure rates

### 2. Health Checks

Implement webhook endpoint health checks:

- **Response time monitoring**
- **Error rate tracking**
- **Database connection verification**

### 3. Manual Verification

Periodically verify subscription consistency:

- **Run cleanup script** weekly/monthly
- **Compare database vs Stripe** subscription counts
- **Alert on discrepancies**

### 4. Product Configuration

Ensure Stripe products are properly configured:

- **Add `plan_key` metadata** to all products
- **Use consistent naming conventions**
- **Test plan mapping** before going live

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check endpoint URL in Stripe Dashboard
   - Verify webhook secret configuration
   - Check server logs for errors

2. **Subscription still shows in UI after cleanup**
   - Clear browser cache
   - Check if UI is using cached data
   - Verify database cleanup was successful

3. **Cleanup endpoint returns errors**
   - Check Stripe API key configuration
   - Verify database connection
   - Check application logs for detailed errors

4. **Plan updates not working**
   - Use debug endpoint to check subscription details
   - Verify product metadata in Stripe
   - Check plan mapping in application logs

### Getting Help

If you continue to experience issues:

1. **Check Stripe webhook logs** for delivery failures
2. **Review application logs** for processing errors
3. **Use debug endpoints** to inspect subscription data
4. **Verify database schema** matches expected structure
5. **Test webhook endpoint** with Stripe CLI locally

## Security Notes

- **GET endpoints are for debugging only** - don't expose in production without authentication
- **Webhook signature verification** is still required for POST requests
- **Database operations** use transactions for data consistency
- **Error handling** prevents sensitive information leakage
