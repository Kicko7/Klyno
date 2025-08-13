'use client';

import { Button, Card, Col, Progress, Row, Spin, Tooltip, Typography, message } from 'antd';
import { useTheme } from 'antd-style';
import {
  Bot,
  CheckCircle,
  Crown,
  Database,
  FileText,
  Globe,
  Headphones,
  MessageSquare,
  Palette,
  Shield,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { Center, Flexbox } from 'react-layout-kit';

import { useStripePlans } from '@/hooks/useStripePlans';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { lambdaClient } from '@/libs/trpc/client';

// Subscription data will be fetched from the hook

const PricingPage = () => {
  const theme = useTheme();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const { plans: stripePlans, isLoading, error } = useStripePlans();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Get user subscription data
  const {
    subscriptionInfo,
    isLoading: subscriptionLoading,
    hasActiveSubscription,
    hasAnySubscription,
    needsUpgrade,
    currentPlan,
    nextBillingDate,
  } = useUserSubscription();

  // Handle checkout for a specific plan
  const handleCheckout = async (plan: any) => {
    // Get the appropriate price ID based on billing cycle
    const priceId = billingCycle === 'monthly' ? plan.monthlyPriceId : plan.yearlyPriceId;

    console.log('Checkout plan:', plan);
    console.log('Billing cycle:', billingCycle);
    console.log('Selected price ID:', priceId);

    if (!priceId) {
      message.error(
        'This plan is not available for purchase. Please contact sales for pricing information.',
      );
      return;
    }

    try {
      setCheckoutLoading(plan.id);
      message.loading('Creating checkout session...', 0);

      // All products are recurring subscriptions → use subscription checkout
      const result = await lambdaClient.stripe.createSubscriptionCheckoutSession.mutate({
        priceId,
      });

      if (result.success && result.url) {
        message.destroy(); // Clear loading message
        message.success('Redirecting to checkout...');
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      message.destroy(); // Clear loading message
      console.error('Checkout error:', error);

      // Provide more helpful error messages
      if (error instanceof Error) {
        if (
          error.message.includes('Only recurring prices are supported for subscription purchases')
        ) {
          message.error('This plan requires a subscription. Please try again or contact support.');
        } else {
          message.error(error.message);
        }
      } else {
        message.error('Failed to create checkout session. Please try again or contact support.');
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Map Stripe plans to UI format, fallback to hardcoded plans if no Stripe data
  const plans =
    stripePlans.length > 0
      ? (() => {
          return stripePlans.map((plan: any) => ({
            ...plan,
            icon: plan.icon || 'star',
            color: theme.colorPrimary,
          }));
        })()
      : [
          {
            id: 'starter-fallback',
            name: 'Starter',
            description: 'For light users who want access to essential AI power.',
            price: { monthly: 12.99, yearly: 129.99 },
            discount: 16.7, // (12.99 * 12 - 129.99) / (12.99 * 12) ≈ 16.7%
            features: [
              '5,000,000 credits/month',
              'Models: GPT-4o mini, DeepSeek R1, Gemini 1.5 Flash',
              '1 GB file storage',
              '5,000 vector entries (50MB)',
              'Unlimited chat history',
              'Global cloud sync',
              'Basic plugins only',
              'BYO API key not allowed',
              'Email and community support',
            ],
            popular: false,
            icon: 'star',
            color: theme.colorSuccess,
            // Fallback plans don't have real price IDs, so disable checkout
            monthlyPriceId: null,
            yearlyPriceId: null,
          },
          {
            id: 'creator-pro-fallback',
            name: 'Creator Pro',
            description:
              'For creators and solo entrepreneurs who want more speed, models, and flexibility.',
            price: { monthly: 29.99, yearly: 299.99 },
            discount: 16.6, // (29.99 * 12 - 299.99) / (29.99 * 12) ≈ 16.6%
            features: [
              '15,000,000 credits/month',
              'Models: GPT-4o, Claude 3, DeepSeek V3, Gemini 2.5, etc.',
              '3 GB file storage',
              '15,000 vector entries (150MB)',
              'Unlimited chat history',
              'Global cloud sync',
              'Premium plugins access',
              'BYO API key optional',
              'Priority email support',
            ],
            popular: true,
            icon: 'crown',
            color: theme.colorWarning,
            // Fallback plans don't have real price IDs, so disable checkout
            monthlyPriceId: null,
            yearlyPriceId: null,
          },
        ];

  // Usage statistics (used/limit + remaining) from quotas
  // Use quota-tracked usage exclusively to avoid negative values when balance > monthly credits
  const creditsLimit =
    subscriptionInfo?.usageQuota?.creditsLimit ??
    subscriptionInfo?.subscription?.monthlyCredits ??
    0;
  const creditsUsedRaw = subscriptionInfo?.usageQuota?.creditsUsed ?? 0;
  const creditsUsed = Math.min(Math.max(creditsUsedRaw, 0), creditsLimit);
  const creditsRemaining = Math.max(creditsLimit - creditsUsed, 0);

  const fileUsedMBRaw = subscriptionInfo?.usageQuota?.fileStorageUsed ?? 0; // quotas store MB
  const fileLimitMBRaw =
    subscriptionInfo?.usageQuota?.fileStorageLimit ??
    (subscriptionInfo?.subscription?.fileStorageLimit
      ? subscriptionInfo.subscription.fileStorageLimit * 1024
      : 0);
  const fileUsedMB = Math.min(Math.max(fileUsedMBRaw, 0), fileLimitMBRaw);
  const fileUsedGB = fileLimitMBRaw > 0 ? fileUsedMB / 1024 : 0;
  const fileLimitGB = fileLimitMBRaw / 1024;
  const fileRemainingGB = Math.max(fileLimitGB - fileUsedGB, 0);

  const vectorUsedMBRaw = subscriptionInfo?.usageQuota?.vectorStorageUsed ?? 0;
  const vectorLimitMB =
    subscriptionInfo?.usageQuota?.vectorStorageLimit ??
    subscriptionInfo?.subscription?.vectorStorageLimit ??
    0;
  const vectorUsedMB = Math.min(Math.max(vectorUsedMBRaw, 0), vectorLimitMB);
  const vectorRemainingMB = Math.max(vectorLimitMB - vectorUsedMB, 0);

  // Debug logging to see what data we're getting
  console.log('Subscription Info:', {
    usageQuota: subscriptionInfo?.usageQuota,
    subscription: subscriptionInfo?.subscription,
    currentCredits: subscriptionInfo?.currentCredits,
  });

  console.log('Calculated Usage:', {
    creditsUsed,
    creditsLimit,
    creditsRemaining,
    fileUsedMB,
    fileUsedGB,
    fileLimitGB,
    fileRemainingGB,
    vectorUsedMB,
    vectorLimitMB,
    vectorRemainingMB,
  });

  // Additional debug for credit calculation
  if (
    subscriptionInfo?.currentCredits !== undefined &&
    subscriptionInfo?.subscription?.monthlyCredits
  ) {
    const calculatedUsed =
      subscriptionInfo.subscription.monthlyCredits - subscriptionInfo.currentCredits;
    console.log('Credit Calculation Debug:', {
      monthlyCredits: subscriptionInfo.subscription.monthlyCredits,
      currentCredits: subscriptionInfo.currentCredits,
      calculatedUsed,
      usageQuotaCreditsUsed: subscriptionInfo?.usageQuota?.creditsUsed,
    });
  }

  // Aggregate for UI
  const usageStats = [
    {
      key: 'credits',
      title: 'Compute Credits',
      current: creditsUsed,
      limit: creditsLimit,
      remaining: creditsRemaining,
      unit: 'credits',
      icon: <Zap size={20} />,
      color: theme.colorPrimary,
    },
    {
      key: 'file',
      title: 'File Storage',
      current: fileUsedGB,
      limit: fileLimitGB,
      remaining: fileRemainingGB,
      unit: 'GB',
      icon: <FileText size={20} />,
      color: theme.colorSuccess,
    },
    {
      key: 'vector',
      title: 'Vector Storage',
      current: vectorUsedMB,
      limit: vectorLimitMB,
      remaining: vectorRemainingMB,
      unit: 'MB',
      icon: <Database size={20} />,
      color: theme.colorWarning,
    },
  ];

  // Show loading state while fetching subscription data
  if (subscriptionLoading) {
    return (
      <div
        style={{
          padding: theme.paddingLG,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Center>
          <Spin size="large" />
          <p style={{ marginTop: theme.marginMD, color: theme.colorTextSecondary }}>
            Loading subscription information...
          </p>
        </Center>
      </div>
    );
  }

  if (hasActiveSubscription) {
    const statusMessages = {
      active: 'Active subscription',
      trialing: 'Trial subscription',
      past_due: 'Payment past due',
      canceled: 'Subscription canceled',
      incomplete: 'Subscription incomplete',
      incomplete_expired: 'Subscription setup expired',
      unpaid: 'Payment required',
    };

    return (
      <div
        style={{
          padding: theme.paddingLG,
          width: '100%',
          height: '100%',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <Center style={{ marginBottom: theme.marginXL }}>
          <h1
            style={{
              fontSize: theme.fontSizeHeading1,
              fontWeight: theme.fontWeightStrong,
              marginBottom: theme.marginSM,
              color: theme.colorText,
            }}
          >
            Your Subscription
          </h1>
          <p
            style={{
              fontSize: theme.fontSizeLG,
              color: theme.colorTextSecondary,
              textAlign: 'center',
              maxWidth: 600,
            }}
          >
            Manage your {currentPlan || 'Premium'} plan and monitor your usage
          </p>
        </Center>

        {/* Current Plan Card */}
        <Card
          style={{
            marginBottom: theme.marginXL,
            border: `2px solid ${theme.colorPrimary}`,
            borderRadius: theme.borderRadiusLG,
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <Flexbox
            horizontal
            align="center"
            justify="space-between"
            style={{ padding: theme.paddingLG }}
          >
            <Flexbox gap={theme.marginMD}>
              <div
                style={{
                  padding: theme.paddingSM,
                  backgroundColor: theme.colorPrimaryBg,
                  borderRadius: theme.borderRadius,
                  color: theme.colorPrimary,
                }}
              >
                <Crown size={32} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: theme.fontSizeHeading2,
                    fontWeight: theme.fontWeightStrong,
                    margin: 0,
                    color: theme.colorText,
                  }}
                >
                  {currentPlan || 'Premium'} Plan
                </h2>
                <p
                  style={{
                    color: theme.colorTextSecondary,
                    margin: 0,
                  }}
                >
                  Next billing:{' '}
                  {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </Flexbox>
            <Button
              type="primary"
              size="large"
              onClick={async () => {
                try {
                  message.loading('Opening billing portal...', 0);
                  const result = await lambdaClient.stripe.createBillingPortalSession.mutate();
                  message.destroy();
                  if (result.success && result.url) {
                    window.location.href = result.url;
                  } else {
                    message.error('Failed to open billing portal');
                  }
                } catch (e) {
                  message.destroy();
                  message.error(e instanceof Error ? e.message : 'Failed to open billing portal');
                }
              }}
            >
              Manage Subscription
            </Button>
          </Flexbox>
        </Card>

        {/* Usage Statistics */}
        <div style={{ marginBottom: theme.marginXL, maxWidth: 1200, margin: '0 auto' }}>
          {/* Credits will be displayed inside the Compute Credits card below to avoid duplication */}
          <div style={{ marginTop: theme.marginLG }}>
            <Typography.Title level={4} style={{ marginBottom: theme.marginMD }}>
              Current Usage
            </Typography.Title>
            <Row gutter={[theme.marginMD, theme.marginMD]}>
              {usageStats.map((stat) => (
                <Col xs={24} sm={12} lg={8} key={stat.key}>
                  <Card
                    size="small"
                    style={{
                      height: '100%',
                      border: `1px solid ${theme.colorBorderSecondary}`,
                      borderRadius: theme.borderRadiusLG,
                    }}
                  >
                    <div style={{ padding: theme.paddingXS }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: theme.marginXS,
                        }}
                      >
                        <Typography.Text
                          style={{
                            fontSize: theme.fontSizeSM,
                            color: theme.colorTextSecondary,
                            fontWeight: 500,
                          }}
                        >
                          {stat.title}
                        </Typography.Text>
                        <Typography.Text
                          style={{
                            fontSize: theme.fontSizeSM,
                            color: theme.colorTextSecondary,
                          }}
                        >
                          {stat.current.toLocaleString()} / {stat.limit.toLocaleString()}{' '}
                          {stat.unit}
                        </Typography.Text>
                      </div>

                      <Progress
                        percent={
                          stat.limit > 0 ? Math.min((stat.current / stat.limit) * 100, 100) : 0
                        }
                        size="small"
                        strokeColor={{
                          '0%': theme.colorSuccess,
                          '70%': theme.colorWarning,
                          '100%': theme.colorError,
                        }}
                        showInfo={true}
                        style={{
                          marginBottom: theme.marginXS,
                          height: 16,
                          backgroundColor: theme.colorBgContainer,
                          border: `1px solid ${theme.colorBorderSecondary}`,
                          borderRadius: theme.borderRadius,
                          boxShadow: `inset 0 1px 2px ${theme.colorBorderSecondary}20`,
                        }}
                        strokeWidth={16}
                        trailColor={theme.colorBorderSecondary}
                        success={{ percent: 0 }}
                        format={(percent) => `${Math.round(percent || 0)}%`}
                      />

                      {/* Show usage details below progress bar */}
                      <div
                        style={{
                          fontSize: theme.fontSizeSM,
                          color: theme.colorTextSecondary,
                          marginBottom: theme.marginXS,
                          textAlign: 'center',
                        }}
                      >
                        Used: {stat.current.toLocaleString()} / Limit: {stat.limit.toLocaleString()}{' '}
                        {stat.unit}
                      </div>

                      {/* Fallback progress bar for 0% to ensure visibility */}
                      {stat.limit === 0 && (
                        <div
                          style={{
                            height: 16,
                            backgroundColor: theme.colorBgContainer,
                            border: `1px solid ${theme.colorBorderSecondary}`,
                            borderRadius: theme.borderRadius,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: theme.marginXS,
                            color: theme.colorTextSecondary,
                            fontSize: theme.fontSizeSM,
                          }}
                        >
                          No limit set
                        </div>
                      )}

                      {/* Debug info - remove in production */}
                      {process.env.NODE_ENV === 'development' && (
                        <div
                          style={{
                            fontSize: theme.fontSizeSM,
                            color: theme.colorTextSecondary,
                            marginBottom: theme.marginXS,
                          }}
                        >
                          Debug: {stat.current} / {stat.limit} ={' '}
                          {stat.limit > 0 ? Math.round((stat.current / stat.limit) * 100) : 0}%
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: theme.marginXS,
                        }}
                      >
                        <Typography.Text
                          style={{
                            fontSize: theme.fontSizeSM,
                            color: theme.colorTextSecondary,
                          }}
                        >
                          Remaining
                        </Typography.Text>
                        <Typography.Text
                          style={{
                            fontSize: theme.fontSizeSM,
                            fontWeight: 600,
                            color: stat.remaining > 0 ? theme.colorSuccess : theme.colorError,
                          }}
                        >
                          {stat.remaining.toLocaleString()} {stat.unit}
                        </Typography.Text>
                      </div>

                      {stat.key === 'credits' &&
                        typeof subscriptionInfo?.currentCredits === 'number' && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: theme.paddingXS,
                              borderTop: `1px solid ${theme.colorBorderSecondary}`,
                              marginTop: theme.marginXS,
                            }}
                          >
                            <Typography.Text
                              style={{
                                fontSize: theme.fontSizeSM,
                                color: theme.colorTextSecondary,
                              }}
                            >
                              Balance
                            </Typography.Text>
                            <Typography.Text
                              style={{
                                fontSize: theme.fontSizeSM,
                                fontWeight: 600,
                                color: theme.colorPrimary,
                              }}
                            >
                              {subscriptionInfo.currentCredits.toLocaleString()} credits
                            </Typography.Text>
                          </div>
                        )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Plan Features */}
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h3
            style={{
              fontSize: theme.fontSizeHeading3,
              fontWeight: theme.fontWeightStrong,
              marginBottom: theme.marginLG,
              color: theme.colorText,
            }}
          >
            Your Plan Features
          </h3>
          <Card>
            <Flexbox gap={theme.marginMD} style={{ flexWrap: 'wrap' }}>
              {[
                { icon: <MessageSquare size={20} />, text: 'Unlimited Message Requests' },
                { icon: <Database size={20} />, text: '2 GB File Storage' },
                { icon: <Bot size={20} />, text: 'Featured Agent Market' },
                { icon: <Palette size={20} />, text: 'Exclusive Premium Plugins' },
                { icon: <Globe size={20} />, text: 'Intelligent Internet Query' },
                { icon: <Headphones size={20} />, text: 'Priority Email Support' },
              ].map((feature, index) => (
                <Flexbox
                  key={index}
                  horizontal
                  align="center"
                  gap={theme.marginSM}
                  style={{ minWidth: 250 }}
                >
                  <CheckCircle size={20} style={{ color: theme.colorSuccess }} />
                  <span style={{ color: theme.colorText }}>{feature.text}</span>
                </Flexbox>
              ))}
            </Flexbox>
          </Card>
        </div>
      </div>
    );
  }

  // Show pricing plans for users without active subscriptions or who need to upgrade
  return (
    <div
      style={{
        padding: theme.paddingLG,
        width: '100%',
        height: '100%',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <Center style={{ marginBottom: theme.marginXL }}>
        <h1
          style={{
            fontSize: theme.fontSizeHeading1,
            fontWeight: theme.fontWeightStrong,
            marginBottom: theme.marginSM,
            color: theme.colorText,
            textAlign: 'center',
          }}
        >
          Plans & Pricing
        </h1>
        <p
          style={{
            fontSize: theme.fontSizeLG,
            color: theme.colorTextSecondary,
            textAlign: 'center',
            maxWidth: 600,
            marginBottom: theme.marginLG,
          }}
        >
          Launch Self-Efficacy. Rediscover Passion of Creation.
        </p>
        <p
          style={{
            fontSize: theme.fontSize,
            color: theme.colorTextSecondary,
            textAlign: 'center',
            maxWidth: 500,
          }}
        >
          Sign up and get a free trial of GPT / Claude / Gemini 450,000 Credits. No credit card
          required.
        </p>
        <Button type="primary" size="large" style={{ marginTop: theme.marginLG }}>
          Claim Your Free Trial Now
        </Button>

        {/* Upgrade Banner for Users with Inactive Subscriptions */}
        {needsUpgrade && subscriptionInfo?.subscription && (
          <Card
            style={{
              marginTop: theme.marginLG,
              maxWidth: 600,
              border: `2px solid ${theme.colorWarning}`,
              backgroundColor: `${theme.colorWarning}05`,
            }}
          >
            <Flexbox horizontal align="center" justify="space-between">
              <Flexbox gap={theme.marginMD} align="center">
                <div
                  style={{
                    padding: theme.paddingSM,
                    backgroundColor: theme.colorWarningBg,
                    borderRadius: theme.borderRadius,
                    color: theme.colorWarning,
                  }}
                >
                  <Shield size={24} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: theme.fontSizeLG,
                      fontWeight: theme.fontWeightStrong,
                      margin: 0,
                      color: theme.colorText,
                    }}
                  >
                    Subscription Needs Attention
                  </h3>
                  <p
                    style={{
                      fontSize: theme.fontSizeSM,
                      color: theme.colorTextSecondary,
                      margin: 0,
                    }}
                  >
                    Your {subscriptionInfo.subscription.planName} plan is currently{' '}
                    <strong>{subscriptionInfo.subscription.status}</strong>. Choose a plan below to
                    reactivate your subscription.
                  </p>
                </div>
              </Flexbox>
              <Button
                type="primary"
                size="middle"
                onClick={async () => {
                  try {
                    message.loading('Opening billing portal...', 0);
                    const result = await lambdaClient.stripe.createBillingPortalSession.mutate();
                    message.destroy();
                    if (result.success && result.url) {
                      window.location.href = result.url;
                    } else {
                      message.error('Failed to open billing portal');
                    }
                  } catch (e) {
                    message.destroy();
                    message.error(e instanceof Error ? e.message : 'Failed to open billing portal');
                  }
                }}
              >
                Manage Subscription
              </Button>
            </Flexbox>
          </Card>
        )}

        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: theme.marginLG, maxWidth: 600, margin: '0 auto' }}>
            <Card
              style={{
                backgroundColor: theme.colorBgContainer,
                border: `1px solid ${theme.colorBorder}`,
              }}
            >
              <p style={{ fontSize: theme.fontSizeSM, margin: 0, color: theme.colorTextSecondary }}>
                <strong>Debug:</strong> hasActiveSubscription: {hasActiveSubscription.toString()},
                hasAnySubscription: {hasAnySubscription.toString()}, needsUpgrade:{' '}
                {needsUpgrade.toString()}, currentPlan: {currentPlan ?? 'null'}, nextBilling:{' '}
                {nextBillingDate ? String(nextBillingDate) : 'null'}
              </p>
            </Card>
          </div>
        )}

        {/* Stripe Status Message */}
        {stripePlans.length === 0 && !isLoading && (
          <div
            style={{
              marginTop: theme.marginLG,
              padding: theme.paddingMD,
              backgroundColor: `${theme.colorInfo}10`,
              border: `1px solid ${theme.colorInfo}`,
              borderRadius: theme.borderRadius,
              color: theme.colorInfo,
              textAlign: 'center',
              maxWidth: 600,
            }}
          >
            <p style={{ margin: 0, fontSize: theme.fontSizeSM }}>
              <strong>Demo Mode:</strong> Currently showing sample pricing plans. Contact our sales
              team to get real-time pricing and set up your subscription.
            </p>
          </div>
        )}
      </Center>

      {/* Billing Cycle Toggle */}
      <Center style={{ marginBottom: theme.marginXL }}>
        <div
          style={{
            display: 'flex',
            backgroundColor: theme.colorBgContainer,
            borderRadius: theme.borderRadiusLG,
            padding: 4,
            border: `1px solid ${theme.colorBorder}`,
          }}
        >
          <Button
            type={billingCycle === 'monthly' ? 'primary' : 'text'}
            onClick={() => setBillingCycle('monthly')}
            style={{
              borderRadius: theme.borderRadius,
              border: 'none',
              boxShadow: billingCycle === 'monthly' ? 'none' : 'none',
            }}
          >
            Monthly
          </Button>
          <Button
            type={billingCycle === 'yearly' ? 'primary' : 'text'}
            onClick={() => setBillingCycle('yearly')}
            style={{
              borderRadius: theme.borderRadius,
              border: 'none',
              boxShadow: billingCycle === 'yearly' ? 'none' : 'none',
            }}
          >
            Yearly
            <span
              style={{
                marginLeft: theme.marginXS,
                backgroundColor: theme.colorSuccess,
                color: theme.colorBgContainer,
                padding: `${theme.paddingXS}px ${theme.paddingMD}px`,
                borderRadius: theme.borderRadius,
                fontSize: theme.fontSizeSM,
                fontWeight: theme.fontWeightStrong,
              }}
            >
              Save up to 37%
            </span>
          </Button>
        </div>
      </Center>

      {/* Pricing Plans */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: theme.marginLG,
          justifyContent: 'center',
          marginBottom: theme.marginXL,
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        {stripePlans.length === 0 && !isLoading && (
          <Center style={{ gridColumn: '1 / -1', padding: theme.paddingMD }}>
            <div
              style={{
                padding: theme.paddingMD,
                backgroundColor: `${theme.colorWarning}10`,
                border: `1px solid ${theme.colorWarning}`,
                borderRadius: theme.borderRadius,
                color: theme.colorWarning,
                textAlign: 'center',
                maxWidth: 600,
              }}
            >
              <p style={{ margin: 0, fontSize: theme.fontSizeSM }}>
                <strong>Note:</strong> Stripe integration is not configured or unavailable. The
                plans shown below are for demonstration purposes only. Contact sales to set up your
                subscription.
              </p>
            </div>
          </Center>
        )}

        {isLoading ? (
          <Center style={{ gridColumn: '1 / -1', padding: theme.paddingXL }}>
            <Spin size="large" />
            <p style={{ marginTop: theme.marginMD, color: theme.colorTextSecondary }}>
              Loading pricing plans...
            </p>
          </Center>
        ) : error ? (
          <Center style={{ gridColumn: '1 / -1', padding: theme.paddingXL }}>
            <p style={{ color: theme.colorError }}>
              Failed to load pricing plans. Using default plans.
            </p>
          </Center>
        ) : (
          plans
            .filter((plan) => plan && plan.name && plan.price)
            .map((plan: any, index: number) => (
              <Card
                key={plan.id || index}
                style={{
                  width: '100%',
                  maxWidth: 350,
                  border: plan.popular
                    ? `2px solid ${plan.color}`
                    : `1px solid ${theme.colorBorder}`,
                  borderRadius: theme.borderRadiusLG,
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: plan.color,
                      color: theme.colorBgContainer,
                      border: `1px solid ${theme.colorBorder}`,
                      padding: `${theme.paddingXS}px ${theme.paddingMD}px`,
                      borderRadius: theme.borderRadius,
                      fontSize: theme.fontSizeSM,
                      fontWeight: theme.fontWeightStrong,
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <div style={{ padding: theme.paddingLG }}>
                  {/* Plan Header */}
                  <div style={{ textAlign: 'center', marginBottom: theme.marginLG }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        padding: theme.paddingMD,
                        backgroundColor: `${plan.color}10`,
                        borderRadius: theme.borderRadius,
                        color: plan.color,
                        marginBottom: theme.marginMD,
                      }}
                    >
                      <Star size={24} />
                    </div>
                    <h3
                      style={{
                        fontSize: theme.fontSizeHeading3,
                        fontWeight: theme.fontWeightStrong,
                        margin: '0 0 8px 0',
                        color: theme.colorText,
                      }}
                    >
                      {plan.name}
                    </h3>
                    <p
                      style={{
                        color: theme.colorTextSecondary,
                        fontSize: theme.fontSizeSM,
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'center', marginBottom: theme.marginLG }}>
                    <div
                      style={{
                        fontSize: theme.fontSizeHeading1,
                        fontWeight: theme.fontWeightStrong,
                        color: theme.colorText,
                      }}
                    >
                      $
                      {plan.price?.[billingCycle] ||
                        plan.price?.[billingCycle === 'monthly' ? 'monthly' : 'yearly'] ||
                        0}
                    </div>
                    <div
                      style={{
                        fontSize: theme.fontSize,
                        color: theme.colorTextSecondary,
                      }}
                    >
                      / {billingCycle === 'monthly' ? 'Month' : 'Month (Yearly)'}
                    </div>
                    {billingCycle === 'yearly' && plan.price?.yearly && (
                      <div
                        style={{
                          fontSize: theme.fontSizeSM,
                          color: theme.colorSuccess,
                          marginTop: theme.marginXS,
                        }}
                      >
                        ${(plan.price.yearly / 12).toFixed(1)} / month
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div style={{ marginBottom: theme.marginLG }}>
                    {Array.isArray(plan.features) && plan.features.length > 0 ? (
                      plan.features.map((feature: string, featureIndex: number) => (
                        <div
                          key={featureIndex}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.marginSM,
                            marginBottom: theme.marginSM,
                            fontSize: theme.fontSizeSM,
                          }}
                        >
                          <CheckCircle
                            size={16}
                            style={{ color: theme.colorSuccess, flexShrink: 0 }}
                          />
                          <span style={{ color: theme.colorText, lineHeight: 1.4 }}>{feature}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: theme.colorTextSecondary, fontStyle: 'italic' }}>
                        No features listed
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Tooltip
                    title={
                      !plan.monthlyPriceId || !plan.yearlyPriceId
                        ? 'Contact sales for pricing information'
                        : 'Start your subscription'
                    }
                  >
                    <Button
                      type={plan.popular ? 'primary' : 'default'}
                      size="large"
                      block
                      loading={checkoutLoading === plan.id}
                      disabled={!plan.monthlyPriceId || !plan.yearlyPriceId}
                      onClick={() => handleCheckout(plan)}
                      style={{
                        backgroundColor: plan.popular ? plan.color : undefined,
                        borderColor: plan.popular ? plan.color : undefined,
                      }}
                    >
                      {plan.monthlyPriceId && plan.yearlyPriceId ? 'Get Started' : 'Contact Sales'}
                    </Button>
                  </Tooltip>
                </div>
              </Card>
            ))
        )}
      </div>

      {/* Enterprise Section */}
      <Center style={{ marginTop: theme.marginXL }}>
        <Card
          style={{
            width: '100%',
            maxWidth: 800,
            textAlign: 'center',
            border: `1px solid ${theme.colorBorder}`,
            backgroundColor: theme.colorBgContainer,
          }}
        >
          <div style={{ padding: theme.paddingXL }}>
            <div
              style={{
                display: 'inline-flex',
                padding: theme.paddingLG,
                backgroundColor: `${theme.colorPrimary}10`,
                borderRadius: theme.borderRadius,
                color: theme.colorPrimary,
                marginBottom: theme.marginLG,
              }}
            >
              <Shield size={48} />
            </div>
            <h3
              style={{
                fontSize: theme.fontSizeHeading2,
                fontWeight: theme.fontWeightStrong,
                margin: '0 0 16px 0',
                color: theme.colorText,
              }}
            >
              Enterprise Edition
            </h3>
            <p
              style={{
                color: theme.colorTextSecondary,
                fontSize: theme.fontSizeLG,
                marginBottom: theme.marginLG,
                lineHeight: 1.6,
              }}
            >
              For enterprises with private deployment or customization needs
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: theme.marginMD,
                marginBottom: theme.marginLG,
                textAlign: 'left',
              }}
            >
              {[
                'Commercial license',
                'Brand theme customization',
                'User management system',
                'Self-service model provider',
                'Private LLM model',
                'Custom integration and support',
              ].map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.marginSM,
                  }}
                >
                  <CheckCircle size={16} style={{ color: theme.colorSuccess, flexShrink: 0 }} />
                  <span style={{ color: theme.colorText, fontSize: theme.fontSizeSM }}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
            <Button type="primary" size="large">
              Contact Us
            </Button>
          </div>
        </Card>
      </Center>

      {/* Manage Subscription Section */}
      {hasActiveSubscription && (
        <div style={{ marginTop: theme.marginXL, maxWidth: 1200, margin: '0 auto' }}>
          <Center style={{ marginBottom: theme.marginLG }}>
            <h3
              style={{
                fontSize: theme.fontSizeHeading2,
                fontWeight: theme.fontWeightStrong,
                color: theme.colorText,
              }}
            >
              Manage Your Subscription
            </h3>
          </Center>
          <Card
            style={{
              border: `1px solid ${theme.colorPrimary}`,
              backgroundColor: `${theme.colorPrimary}05`,
            }}
          >
            <Flexbox
              horizontal
              align="center"
              justify="space-between"
              style={{ padding: theme.paddingLG }}
            >
              <div>
                <h4
                  style={{
                    fontSize: theme.fontSizeLG,
                    fontWeight: theme.fontWeightStrong,
                    margin: '0 0 8px 0',
                    color: theme.colorText,
                  }}
                >
                  {currentPlan} Plan
                </h4>
                <p
                  style={{
                    color: theme.colorTextSecondary,
                    margin: 0,
                    fontSize: theme.fontSizeSM,
                  }}
                >
                  Next billing date:{' '}
                  {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <Flexbox horizontal gap={theme.marginMD}>
                <Button type="primary" size="large">
                  Manage Subscription
                </Button>
                <Button size="large">View Usage Details</Button>
              </Flexbox>
            </Flexbox>
          </Card>
        </div>
      )}

      {/* FAQ Section */}
      <div style={{ marginTop: theme.marginXL, maxWidth: 1200, margin: '0 auto' }}>
        <Center style={{ marginBottom: theme.marginLG }}>
          <h3
            style={{
              fontSize: theme.fontSizeHeading2,
              fontWeight: theme.fontWeightStrong,
              color: theme.colorText,
            }}
          >
            Frequently Asked Questions
          </h3>
        </Center>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: theme.marginLG,
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {[
            {
              question: 'Can LobeChat be used for free?',
              answer:
                'Yes, LobeChat offers a free community edition with basic features. For advanced features and higher usage limits, you can subscribe to our paid plans.',
            },
            {
              question: 'What are calculating credits?',
              answer:
                'Credits are used to measure AI model usage. Different models consume different amounts of credits based on their complexity and token usage.',
            },
            {
              question: 'What to do if calculating credits are insufficient?',
              answer:
                'You can upgrade your plan to get more credits, or contact our support team for assistance with usage optimization.',
            },
            {
              question: 'How to change or cancel a subscription plan?',
              answer:
                'You can manage your subscription through your account settings or contact our support team for assistance with plan changes.',
            },
          ].map((faq, index) => (
            <Card key={index} style={{ border: `1px solid ${theme.colorBorder}` }}>
              <h4
                style={{
                  fontSize: theme.fontSizeLG,
                  fontWeight: theme.fontWeightStrong,
                  margin: '0 0 12px 0',
                  color: theme.colorText,
                }}
              >
                {faq.question}
              </h4>
              <p
                style={{
                  color: theme.colorTextSecondary,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {faq.answer}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <Center style={{ marginTop: theme.marginXL }}>
        <div style={{ textAlign: 'center' }}>
          <h3
            style={{
              fontSize: theme.fontSizeHeading2,
              fontWeight: theme.fontWeightStrong,
              margin: '0 0 16px 0',
              color: theme.colorText,
            }}
          >
            Launch Self-Efficacy. Rediscover Passion of Creation.
          </h3>
          <p
            style={{
              color: theme.colorTextSecondary,
              fontSize: theme.fontSizeLG,
              marginBottom: theme.marginLG,
              maxWidth: 600,
            }}
          >
            Explore the rich ecosystem of intelligent agents and easily orchestrate your ideal
            workflow, you'll do amazing things with LobeChat.
          </p>
          <Flexbox horizontal gap={theme.marginMD} justify="center">
            <Button type="primary" size="large">
              Free Trial
            </Button>
            <Button size="large">GitHub</Button>
          </Flexbox>
        </div>
      </Center>
    </div>
  );
};

export default PricingPage;
