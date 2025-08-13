export interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: 'month' | 'year';
    interval_count: number;
  };
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  metadata: {
    features?: string;
    popular?: string;
    icon?: string;
    color?: string;
  };
  marketing_features: string[];
  prices: StripePrice[];
}

export interface StripePlan {
  id: string;
  name: string;
  description: string;
  features: string[];
  popular: boolean;
  icon: string;
  color: string;
  price: {
    monthly: number;
    yearly: number;
  };
  discount: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
}

export interface StripeConfig {
  publishableKey: string;
  apiVersion: string;
}
