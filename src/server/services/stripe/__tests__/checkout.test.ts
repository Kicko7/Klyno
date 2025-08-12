import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StripeCheckoutService } from '../checkout';

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: vi.fn().mockResolvedValue({
          id: 'cus_test123',
          metadata: { userId: 'user123' },
        }),
        retrieve: vi.fn().mockResolvedValue({
          id: 'cus_test123',
          metadata: { userId: 'user123' },
        }),
      },
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'price_test123',
          recurring: null, // One-time price
          metadata: { credits_amount: '1000' },
          product: 'prod_test123',
        }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test123',
            url: 'https://checkout.stripe.com/test',
          }),
        },
      },
    })),
  };
});

// Mock database
vi.mock('@/database', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

// Mock config
vi.mock('@/config/stripe', () => ({
  getStripeConfig: vi.fn().mockReturnValue({
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_API_VERSION: '2025-07-30.basil',
  }),
}));

describe('StripeCheckoutService', () => {
  let service: StripeCheckoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StripeCheckoutService();
  });

  describe('ensureCustomer', () => {
    it('should return existing customer ID if user has one', async () => {
      // Mock existing customer
      vi.mocked(require('@/database').db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ stripeCustomerId: 'cus_existing' }]),
          }),
        }),
      });

      const customerId = await service.ensureCustomer('user123');
      expect(customerId).toBe('cus_existing');
    });

    it('should create new customer if user does not have one', async () => {
      const customerId = await service.ensureCustomer('user123', 'test@example.com');
      expect(customerId).toBe('cus_test123');
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully', async () => {
      const session = await service.createCheckoutSession(
        'user123',
        'price_test123',
        'https://success.com',
        'https://cancel.com',
      );

      expect(session.id).toBe('cs_test123');
      expect(session.url).toBe('https://checkout.stripe.com/test');
    });

    it('should throw error for recurring prices', async () => {
      // Mock recurring price
      vi.mocked(require('stripe').default).mockImplementation(() => ({
        customers: {
          create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
        },
        prices: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'price_test123',
            recurring: { interval: 'month' }, // Recurring price
          }),
        },
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({}),
          },
        },
      }));

      await expect(
        service.createCheckoutSession(
          'user123',
          'price_test123',
          'https://success.com',
          'https://cancel.com',
        ),
      ).rejects.toThrow('Only one-time prices are supported for credit purchases');
    });
  });

  describe('createAutoCheckoutSession', () => {
    it('should create subscription checkout session for recurring prices', async () => {
      // Mock recurring price
      vi.mocked(require('stripe').default).mockImplementation(() => ({
        customers: {
          create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
        },
        prices: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'price_test123',
            recurring: { interval: 'month' }, // Recurring price
          }),
        },
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test123',
              url: 'https://checkout.stripe.com/test',
            }),
          },
        },
      }));

      const service = new StripeCheckoutService();
      const session = await service.createAutoCheckoutSession(
        'user123',
        'price_test123',
        'https://success.com',
        'https://cancel.com',
      );

      expect(session.id).toBe('cs_test123');
      expect(session.url).toBe('https://checkout.stripe.com/test');
    });

    it('should create one-time checkout session for non-recurring prices', async () => {
      // Mock one-time price
      vi.mocked(require('stripe').default).mockImplementation(() => ({
        customers: {
          create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
        },
        prices: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'price_test123',
            recurring: null, // One-time price
            metadata: { credits_amount: '1000' },
          }),
        },
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test123',
              url: 'https://checkout.stripe.com/test',
            }),
          },
        },
      }));

      const service = new StripeCheckoutService();
      const session = await service.createAutoCheckoutSession(
        'user123',
        'price_test123',
        'https://success.com',
        'https://cancel.com',
      );

      expect(session.id).toBe('cs_test123');
      expect(session.url).toBe('https://checkout.stripe.com/test');
    });
  });

  describe('getCreditsAmount', () => {
    it('should get credits amount from price metadata', async () => {
      const creditsAmount = await service.getCreditsAmount('price_test123');
      expect(creditsAmount).toBe(1000);
    });

    it('should get credits amount from product metadata if not in price', async () => {
      // Mock price without credits_amount in metadata
      vi.mocked(require('stripe').default).mockImplementation(() => ({
        prices: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'price_test123',
            metadata: {},
            product: {
              id: 'prod_test123',
              metadata: { credits_amount: '500' },
            },
          }),
        },
      }));

      const creditsAmount = await service.getCreditsAmount('price_test123');
      expect(creditsAmount).toBe(500);
    });

    it('should throw error if no credits_amount found', async () => {
      // Mock price and product without credits_amount
      vi.mocked(require('stripe').default).mockImplementation(() => ({
        prices: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'price_test123',
            metadata: {},
            product: {
              id: 'prod_test123',
              metadata: {},
            },
          }),
        },
      }));

      await expect(service.getCreditsAmount('price_test123')).rejects.toThrow(
        'No credits_amount found in metadata for price price_test123',
      );
    });
  });
});
