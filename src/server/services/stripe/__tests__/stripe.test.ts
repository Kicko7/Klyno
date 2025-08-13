import { describe, expect, it, vi } from 'vitest';

import { StripeService } from '../index';

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      products: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'prod_test1',
              name: 'Test Plan',
              description: 'Test description',
              metadata: {
                features: '["Feature 1", "Feature 2"]',
                popular: 'false',
                icon: 'star',
                color: 'success',
              },
            },
          ],
        }),
      },
      prices: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'price_monthly',
              unit_amount: 1299,
              currency: 'usd',
              recurring: { interval: 'month', interval_count: 1 },
            },
            {
              id: 'price_yearly',
              unit_amount: 12999,
              currency: 'usd',
              recurring: { interval: 'year', interval_count: 1 },
            },
          ],
        }),
      },
    })),
  };
});

// Mock environment variables
vi.mock('@/config/stripe', () => ({
  getStripeConfig: () => ({
    STRIPE_SECRET_KEY: 'test_key',
    STRIPE_API_VERSION: '2025-07-30.basil',
  }),
}));

describe('StripeService', () => {
  it('should create instance with valid config', () => {
    const service = new StripeService();
    expect(service).toBeInstanceOf(StripeService);
  });

  it('should throw error without secret key', () => {
    vi.mocked(require('@/config/stripe').getStripeConfig).mockReturnValue({
      STRIPE_SECRET_KEY: undefined,
      STRIPE_API_VERSION: '2025-07-30.basil',
    });

    expect(() => new StripeService()).toThrow('STRIPE_SECRET_KEY is required for StripeService');
  });

  it('should fetch products successfully', async () => {
    const service = new StripeService();
    const products = await service.getProducts();

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      id: 'prod_test1',
      name: 'Test Plan',
      description: 'Test description',
    });
  });

  it('should fetch plans successfully', async () => {
    const service = new StripeService();
    const plans = await service.getPlans();

    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      name: 'Test Plan',
      description: 'Test description',
      features: ['Feature 1', 'Feature 2'],
      popular: false,
      icon: 'star',
      color: 'success',
      price: {
        monthly: 12.99,
        yearly: 129.99,
      },
    });
  });
});
