# Pricing Page Subscription Integration

## Overview

This document outlines the integration of user subscription data with the pricing page, providing conditional rendering and subscription management features.

## Features Implemented

### 1. **Real-time Subscription Data**

- **Hook**: `useUserSubscription` - Fetches current subscription status from database
- **Data Source**: `user_subscriptions` and `user_usage_quotas` tables
- **Real-time Updates**: Subscription data refreshes automatically

### 2. **Conditional Rendering**

- **Subscription Status Banner**: Shows when user has active subscription
- **Usage Summary**: Displays current usage vs. limits for subscribed users
- **Manage Subscription Section**: Dedicated section for subscription management
- **Plan-specific Content**: Different UI based on subscription status

### 3. **Subscription Information Display**

- **Current Plan**: Shows active plan name
- **Billing Cycle**: Next billing date
- **Usage Metrics**:
  - Compute credits used/limit
  - File storage used/limit (GB)
  - Vector storage used/limit (MB)
- **Progress Bars**: Visual representation of usage

### 4. **Subscription Management**

- **Manage Subscription Button**: Links to subscription management
- **View Usage Details Button**: Shows detailed usage breakdown
- **Plan Features**: Lists features included in current plan

## Technical Implementation

### Database Schema

```typescript
// User subscriptions table
userSubscriptions: {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing' | 'unpaid';
  monthlyCredits: number;
  fileStorageLimit: number; // GB
  vectorStorageLimit: number; // MB
  currentPeriodEnd: Date;
  // ... other fields
}

// Usage quotas table
userUsageQuotas: {
  id: string;
  userId: string;
  creditsUsed: number;
  creditsLimit: number;
  fileStorageUsedMB: number;
  fileStorageLimitMB: number;
  vectorStorageUsedMB: number;
  vectorStorageLimitMB: number;
  // ... other fields
}
```

### Hook Implementation

```typescript
export const useUserSubscription = () => {
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetches subscription data from tRPC endpoint
  const fetchSubscriptionInfo = useCallback(async () => {
    // ... implementation
  }, [isSignedIn, user?.id]);

  return {
    subscriptionInfo,
    isLoading,
    error,
    hasActiveSubscription: subscriptionInfo?.subscription?.status === 'active',
    currentPlan: subscriptionInfo?.subscription?.planName || null,
    nextBillingDate: subscriptionInfo?.subscription?.currentPeriodEnd,
  };
};
```

### tRPC Endpoint

```typescript
// src/server/routers/lambda/subscription.ts
export const subscriptionRouter = router({
  getUserSubscriptionInfo: authedProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => {
      const subscriptionManager = new SubscriptionManager();
      const subscriptionInfo = await subscriptionManager.getUserSubscriptionInfo(input.userId);

      return {
        success: true,
        data: subscriptionInfo,
        message: 'Subscription info retrieved successfully',
      };
    }),
});
```

## UI Components

### 1. **Subscription Status Banner**

- **Location**: Above pricing plans
- **Condition**: `hasActiveSubscription === true`
- **Content**: Plan name, next billing date, manage button

### 2. **Usage Summary Cards**

- **Location**: Below header, above pricing plans
- **Condition**: `hasActiveSubscription === true`
- **Content**: Three cards showing usage for credits, storage, and vectors

### 3. **Manage Subscription Section**

- **Location**: Above FAQ section
- **Condition**: `hasActiveSubscription === true`
- **Content**: Plan details, billing info, action buttons

### 4. **Full Subscription View**

- **Condition**: `hasActiveSubscription === true`
- **Content**: Complete subscription dashboard with usage tracking

## Conditional Rendering Logic

```typescript
// Main conditional rendering
if (subscriptionLoading) {
  return <LoadingSpinner />;
}

if (hasActiveSubscription) {
  return <SubscriptionDashboard />;
}

// Default pricing page
return <PricingPlans />;
```

## Usage Examples

### 1. **New User (No Subscription)**

- Sees standard pricing plans
- Free trial button
- No subscription-specific content

### 2. **Active Subscriber**

- Sees subscription status banner
- Usage summary cards
- Manage subscription section
- Full subscription dashboard available

### 3. **Past Due/Canceled Subscription**

- Sees subscription status (if any)
- May show upgrade prompts
- Limited access to premium features

## Future Enhancements

### 1. **Subscription Management**

- Cancel subscription
- Upgrade/downgrade plans
- Payment method management
- Billing history

### 2. **Usage Analytics**

- Historical usage charts
- Usage predictions
- Cost optimization suggestions

### 3. **Notifications**

- Usage threshold alerts
- Billing reminders
- Plan upgrade suggestions

### 4. **Admin Features**

- Bulk subscription management
- Usage analytics dashboard
- Revenue reporting

## Testing

### 1. **Development Mode**

- Debug info panel shows subscription state
- Easy to verify data flow
- Console logging for troubleshooting

### 2. **Production Mode**

- Debug info hidden
- Error boundaries for graceful failures
- Performance optimized

## Security Considerations

- **Authentication Required**: All subscription endpoints require user authentication
- **User Isolation**: Users can only access their own subscription data
- **Input Validation**: tRPC input validation prevents injection attacks
- **Rate Limiting**: API endpoints protected against abuse

## Performance Optimizations

- **Lazy Loading**: Subscription data loaded only when needed
- **Caching**: Subscription data cached in React state
- **Debounced Updates**: Usage updates don't trigger excessive re-renders
- **Optimistic Updates**: UI updates immediately, syncs in background

## Troubleshooting

### Common Issues

1. **Subscription Not Loading**
   - Check user authentication
   - Verify database connection
   - Check tRPC endpoint availability

2. **Usage Data Missing**
   - Verify subscription status is 'active'
   - Check usage quota records exist
   - Verify database schema matches

3. **UI Not Updating**
   - Check React state updates
   - Verify conditional rendering logic
   - Check for TypeScript errors

### Debug Tools

- **Development Mode**: Debug info panel
- **Console Logging**: Subscription data flow
- **React DevTools**: State inspection
- **Network Tab**: API call monitoring
