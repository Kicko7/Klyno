import { StripePlan } from '@/types/stripe';

export const mapStripePlanToUIPlan = (stripePlan: StripePlan, theme: any) => {
  const colorKey = stripePlan.color || 'primary';
  const color =
    theme[`color${colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}`] || theme.colorPrimary;

  return {
    id: stripePlan.id,
    name: stripePlan.name,
    description: stripePlan.description,
    price: stripePlan.price,
    discount: stripePlan.discount,
    features: stripePlan.features,
    popular: stripePlan.popular,
    icon: stripePlan.icon || 'star',
    color,
  };
};
