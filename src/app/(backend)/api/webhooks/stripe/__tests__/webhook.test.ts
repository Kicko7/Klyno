import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStripeConfig } from '@/config/stripe';
import { CreditManager } from '@/server/services/credits/creditManager';
import { SubscriptionManager } from '@/server/services/subscriptions/subscriptionManager';

import { POST } from '../route';

// Mock dependencies
vi.mock('@/config/stripe');
vi.mock('@/database');
vi.mock('@/server/services/credits/creditManager');
vi.mock('@/server/services/subscriptions/subscriptionManager');

const mockGetStripeConfig = vi.mocked(getStripeConfig);
const mockCreditManager = vi.mocked(CreditManager);
const mockSubscriptionManager = vi.mocked(SubscriptionManager);

describe('Stripe Webhook Handler', () => {
  let mockRequest: NextRequest;
  let mockStripe: any;
  let mockHeaders: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Stripe config
    mockGetStripeConfig.mockReturnValue({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      STRIPE_API_VERSION: '2025-07-30.basil',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
    });

    // Mock Stripe instance
    mockStripe = {
      webhooks: {
        constructEvent: vi.fn(),
      },
      subscriptions: {
        retrieve: vi.fn(),
      },
      products: {
        retrieve: vi.fn(),
      },
      prices: {
        retrieve: vi.fn(),
      },
    };

    // Mock CreditManager
    mockCreditManager.mockImplementation(() => ({
      addCredits: vi.fn(),
      findTransactionByPaymentIntent: vi.fn(),
      refundCredits: vi.fn(),
    }));

    // Mock SubscriptionManager
    mockSubscriptionManager.mockImplementation(() => ({
      upsertSubscription: vi.fn(),
      allocateMonthlyCredits: vi.fn(),
      removeDeletedSubscription: vi.fn(),
    }));

    // Mock request
    mockRequest = {
      text: vi.fn(),
    } as any;

    // Mock headers
    mockHeaders = {
      get: vi.fn(),
    };

    vi.mock('next/headers', () => ({
      headers: () => mockHeaders,
    }));
  });

  describe('POST /api/webhook/stripe', () => {
    it('should return 400 when stripe-signature header is missing', async () => {
      mockHeaders.get.mockReturnValue(null);
      mockRequest.text.mockResolvedValue('{}');

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing stripe-signature header');
    });

    it('should return 500 when Stripe is not configured', async () => {
      mockGetStripeConfig.mockReturnValue({
        STRIPE_SECRET_KEY: undefined,
        STRIPE_WEBHOOK_SECRET: undefined,
        STRIPE_API_VERSION: undefined,
      });

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue('{}');

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Stripe not configured');
    });

    it('should return 400 when webhook signature verification fails', async () => {
      mockHeaders.get.mockReturnValue('invalid_signature');
      mockRequest.text.mockResolvedValue('{}');

      // Mock Stripe to throw error on signature verification
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockImplementation(() => {
            throw new Error('Invalid signature');
          }),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid signature');
    });

    it('should process checkout.session.completed for one-time payment', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            mode: 'payment',
            metadata: {
              userId: 'user_123',
              priceId: 'price_123',
            },
            payment_intent: 'pi_test_123',
            currency: 'usd',
            line_items: {
              data: [
                {
                  price: {
                    product: 'prod_123',
                  },
                },
              ],
            },
          },
        },
      };

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue(JSON.stringify(mockEvent));

      // Mock successful signature verification
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
        prices: {
          retrieve: vi.fn().mockResolvedValue({ id: 'price_123' }),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should process checkout.session.completed for subscription', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            mode: 'subscription',
            metadata: {
              userId: 'user_123',
              priceId: 'price_123',
            },
            subscription: 'sub_test_123',
          },
        },
      };

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue(JSON.stringify(mockEvent));

      // Mock successful signature verification and Stripe API calls
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            cancel_at_period_end: false,
            items: {
              data: [
                {
                  price: {
                    id: 'price_123',
                    product: 'prod_123',
                  },
                },
              ],
            },
          }),
        },
        products: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'prod_123',
            name: 'Test Plan',
            metadata: {
              monthly_credits: '1000',
              file_storage_gb: '1',
              vector_storage_mb: '50',
              plan_key: 'test',
            },
          }),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should process customer.subscription.created', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            metadata: {
              userId: 'user_123',
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            cancel_at_period_end: false,
            items: {
              data: [
                {
                  price: {
                    id: 'price_123',
                    product: 'prod_123',
                  },
                },
              ],
            },
          },
        },
      };

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue(JSON.stringify(mockEvent));

      // Mock successful signature verification and Stripe API calls
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
        products: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'prod_123',
            name: 'Test Plan',
            metadata: {
              monthly_credits: '1000',
              file_storage_gb: '1',
              vector_storage_mb: '50',
              plan_key: 'test',
            },
          }),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should process customer.subscription.updated', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            metadata: {
              userId: 'user_123',
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            cancel_at_period_end: false,
            items: {
              data: [
                {
                  price: {
                    id: 'price_123',
                    product: 'prod_123',
                  },
                },
              ],
            },
          },
        },
      };

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue(JSON.stringify(mockEvent));

      // Mock successful signature verification and Stripe API calls
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
        products: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'prod_123',
            name: 'Test Plan',
            metadata: {
              monthly_credits: '1000',
              file_storage_gb: '1',
              vector_storage_mb: '50',
              plan_key: 'test',
            },
          }),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should process customer.subscription.deleted', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            metadata: {
              userId: 'user_123',
            },
          },
        },
      };

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue(JSON.stringify(mockEvent));

      // Mock successful signature verification
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should process invoice.payment_succeeded', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            subscription: 'sub_test_123',
          },
        },
      };

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue(JSON.stringify(mockEvent));

      // Mock successful signature verification and Stripe API calls
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            metadata: {
              userId: 'user_123',
            },
          }),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should process invoice.payment_failed', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_123',
            subscription: 'sub_test_123',
          },
        },
      };

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue(JSON.stringify(mockEvent));

      // Mock successful signature verification and Stripe API calls
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'past_due',
            metadata: {
              userId: 'user_123',
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            cancel_at_period_end: false,
            items: {
              data: [
                {
                  price: {
                    id: 'price_123',
                  },
                },
              ],
            },
          }),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should process charge.refunded', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test_123',
            payment_intent: 'pi_test_123',
            currency: 'usd',
          },
        },
      };

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue(JSON.stringify(mockEvent));

      // Mock successful signature verification
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should handle unhandled event types gracefully', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'unknown.event.type',
        data: {
          object: {},
        },
      };

      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockResolvedValue(JSON.stringify(mockEvent));

      // Mock successful signature verification
      const mockStripeConstructor = vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn().mockReturnValue(mockEvent),
        },
      });

      vi.doMock('stripe', () => ({
        default: mockStripeConstructor,
      }));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should return 500 on webhook processing error', async () => {
      mockHeaders.get.mockReturnValue('valid_signature');
      mockRequest.text.mockRejectedValue(new Error('Request processing failed'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Webhook processing failed');
    });
  });
});
