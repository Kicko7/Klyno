# Stripe Credit Purchase System - PR Notes

## 🎯 Overview

This PR implements a complete Stripe Checkout system for one-time prepaid credit purchases in LobeChat. The system provides secure, idempotent webhook processing with automatic credit balance management.

## ✨ Features Added

### Core Functionality

- **One-time credit purchases** via Stripe Checkout (no subscriptions)
- **Automatic credit balance updates** upon successful payment
- **Refund support** for charge reversals
- **Idempotent webhook processing** to prevent duplicate operations

### Security & Safety

- **Webhook signature verification** using Stripe's signing secret
- **Server-side price validation** (only one-time prices allowed)
- **Database transactions** with SELECT FOR UPDATE for concurrency safety
- **Unique constraints** on Stripe event IDs for idempotency

### Database Schema

- New `user_credits` table for tracking user balances
- New `credit_transactions` table for purchase/refund history
- Added `stripe_customer_id` field to existing `users` table

## 🏗️ Architecture

### Services

- **`StripeCheckoutService`**: Handles checkout session creation and customer management
- **`CreditManager`**: Manages credit balance updates and transaction recording
- **Enhanced `StripeService`**: Extended with checkout capabilities

### API Endpoints

- **tRPC**: `stripe.createCheckoutSession` (authenticated)
- **Webhook**: `POST /api/webhook/stripe` (signature verified)

### Database Design

- **Normalized structure** with proper foreign key relationships
- **Indexed fields** for optimal query performance
- **Audit trail** with comprehensive transaction logging

## 🔧 Implementation Details

### Stripe Integration

- Uses existing Stripe configuration and service structure
- Extends with checkout-specific functionality
- Maintains compatibility with existing subscription features

### Webhook Processing

- Handles `checkout.session.completed` and `charge.refunded` events
- Processes webhooks idempotently using `stripe_event_id`
- Gracefully handles errors without breaking webhook delivery

### Credit Management

- Atomic balance updates using database transactions
- Support for both purchases (positive) and refunds (negative)
- Automatic creation of user credit records on first purchase

## 📋 Required Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxx
APP_URL=https://yourdomain.com
```

## 🧪 Testing

### Unit Tests

- **StripeCheckoutService**: Tests customer creation, checkout sessions, and credit amount retrieval
- **Webhook Handler**: Tests signature verification, event processing, and error handling
- **CreditManager**: Tests credit operations and idempotency

### Integration Testing

- Use Stripe CLI for local webhook testing
- Test with Stripe test products and prices
- Verify idempotency by replaying webhook events

### Manual Testing

1. Create test products with `credits_amount` metadata
2. Complete test checkout flow
3. Verify credits are added to user balance
4. Test refund processing
5. Confirm idempotency by resending webhook events

## 🚀 Deployment Steps

### 1. Environment Setup

- Add required environment variables
- Configure Stripe webhook endpoint
- Set up Stripe products with proper metadata

### 2. Database Migration

```bash
npm run db:migrate
```

### 3. Webhook Configuration

- Add webhook endpoint in Stripe Dashboard
- Select required events: `checkout.session.completed`, `charge.refunded`
- Copy webhook signing secret to environment

### 4. Product Setup

- Create products in Stripe Dashboard
- Add `credits_amount` metadata to prices/products
- Test with small amounts first

## 🔒 Security Considerations

### Webhook Security

- All webhooks verified using Stripe signature
- No webhook processing without valid signature
- Idempotent processing prevents replay attacks

### Data Validation

- Server-side price validation (no recurring prices)
- User authentication required for checkout creation
- Database constraints prevent invalid data

### Access Control

- Checkout endpoint requires authentication
- Webhook endpoint only accessible by Stripe
- No sensitive data exposed in client responses

## 📊 Monitoring & Observability

### Logging

- Comprehensive webhook processing logs
- Error logging for failed operations
- Audit trail for all credit transactions

### Metrics to Track

- Webhook delivery success rate
- Credit purchase completion rate
- Average processing time for webhooks
- Error rates by event type

## 🐛 Known Limitations

### Current Implementation

- Assumes full refunds (partial refunds need enhancement)
- Limited to one-time prices only
- No support for async payment methods

### Future Enhancements

- Partial refund support
- Async payment method handling
- Credit expiration system
- Bulk credit operations

## 🔄 Migration Strategy

### Zero-Downtime Deployment

- Database migration adds new tables without affecting existing data
- New services are additive and don't break existing functionality
- Webhook endpoint can be deployed before Stripe configuration

### Rollback Plan

- Remove webhook endpoint from Stripe Dashboard
- Drop new tables if needed (migration includes down method)
- Remove environment variables

## 📚 Documentation

### Developer Documentation

- Comprehensive API reference
- Database schema documentation
- Service architecture overview

### User Documentation

- Setup and configuration guide
- Troubleshooting common issues
- Best practices for product configuration

## 🤝 Testing Checklist

### Pre-Deployment

- [ ] Unit tests passing
- [ ] Integration tests with Stripe test environment
- [ ] Database migration tested
- [ ] Webhook signature verification tested
- [ ] Idempotency verified

### Post-Deployment

- [ ] Webhook endpoint accessible
- [ ] Test checkout flow completed
- [ ] Credits added to user balance
- [ ] Refund processing tested
- [ ] Error handling verified

## 🎉 Success Criteria

- Users can purchase credits via Stripe Checkout
- Credits are automatically added to user balance
- Webhook processing is secure and idempotent
- Refund processing works correctly
- System handles errors gracefully
- Performance meets production requirements

## 🔍 Code Review Focus Areas

### Security

- Webhook signature verification implementation
- Input validation and sanitization
- Database transaction safety

### Performance

- Database query optimization
- Webhook processing efficiency
- Error handling performance

### Maintainability

- Service separation and responsibilities
- Error handling patterns
- Code documentation and clarity

## 📝 Additional Notes

- This implementation builds on existing Stripe infrastructure
- Maintains backward compatibility with current features
- Follows established patterns in the codebase
- Includes comprehensive error handling and logging
- Designed for easy extension and enhancement
