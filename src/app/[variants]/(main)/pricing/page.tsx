"use client"

import { Button, Card, Col, Progress, Row, Spin, Typography, message, Tabs } from "antd"
import { useTheme, createStyles } from "antd-style"
import { CheckCircle, Crown, Database, FileText, Star, Zap } from "lucide-react"
import { useState } from "react"
import { Center } from "react-layout-kit"

import { useStripePlans } from "@/hooks/useStripePlans"
import { useUserSubscription } from "@/hooks/useUserSubscription"
import { lambdaClient } from "@/libs/trpc/client"

const useStyles = createStyles(({ css }) => ({
  customTabs: css`
    .ant-tabs-tab {
      font-size: 16px;
      font-weight: 600;
    }
  `,
}));

const PricingPage = () => {
  const theme = useTheme()
  const { styles } = useStyles()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly")
  const { plans: stripePlans, isLoading, error } = useStripePlans()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  // Get user subscription data
  const {
    subscriptionInfo,
    isLoading: subscriptionLoading,
    hasActiveSubscription,
    hasAnySubscription,
    needsUpgrade,
    currentPlan,
    nextBillingDate,
  } = useUserSubscription()

  // Handle checkout for a specific plan

 

  const handleCheckout = async (plan: any) => {
    const priceId = billingCycle === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId

    if (!priceId) {
      message.error("This plan is not available for purchase. Please contact sales for pricing information.")
      return
    }

    try {
      setCheckoutLoading(plan.id)
      
      // Different messages for new subscriptions vs upgrades
      const isUpgrade = hasActiveSubscription;

      const messageText = isUpgrade 
        ? "Opening subscription management..." 
        : "Creating checkout session...";
      
      message.loading(messageText, 0)

      let result: any;
      if(isUpgrade) {
         // For upgrades, redirect to Stripe Customer Portal where users can manage their subscription
         result = await lambdaClient.stripe.createBillingPortalSession.mutate()
      }
      else {
        result = await lambdaClient.stripe.createSubscriptionCheckoutSession.mutate({
         priceId,
       })
      }


      // Check if we have a valid checkout session result
      if (result && (result.url || result.id)) {
        message.destroy()
        const successText = isUpgrade 
          ? `Redirecting to subscription management...` 
          : "Redirecting to checkout...";
        message.success(successText)
        
        // If we have a URL, redirect to it
        if (result.url) {
          window.location.href = result.url
        } else if (result.id) {
          // If we only have an ID, we might need to handle this differently
          console.log("Checkout session created with ID:", result.id)
          message.info("Checkout session created. Please complete your payment.")
        }
      } else {
        console.error("Invalid checkout session result:", result)
        message.error("Failed to create checkout session. Please try again.")
      }
    } catch (error) {
      message.destroy()
      console.error("Checkout error:", error)

      if (error instanceof Error) {
        if (error.message.includes("Only recurring prices are supported for subscription purchases")) {
          message.error("This plan requires a subscription. Please try again or contact support.")
        } else {
          message.error(error.message)
        }
      } else {
        message.error("Failed to create checkout session. Please try again or contact support.")
      }
    } finally {
      setCheckoutLoading(null)
    }
  }


  // const handleUpgrade = async (plan: any) => {
  //   const priceId = billingCycle === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId
  //   if (!priceId) {
  //     message.error("This plan is not available for purchase. Please contact sales for pricing information.")
  //     return
  //   }
  // }

  // Map Stripe plans to UI format, fallback to hardcoded plans if no Stripe data
  const plans =
    stripePlans.length > 0
      ? stripePlans.map((plan: any) => ({
        ...plan,
        icon: plan.icon || "star",
        color: theme.colorPrimary,
      }))
      : [
        {
          id: "starter-fallback",
          name: "Starter",
          description: "Suitable for users who occasionally use AI features",
          price: { monthly: 9.9, yearly: 118.8 },
          discount: 25,
          features: [
            "5,000,000 / Month",
            "GPT-4o mini",
            "Approx 7,000 messages",
            "DeepSeek R1",
            "Approx 1,900 messages",
            "See more models in the plan comparison",
            "Use file and knowledge base features in conversations",
            "File Storage: 1.0 GB",
            "Vector Storage: 5,000 entry",
            "Global mainstream model custom API services",
            "Unlimited Message Requests",
            "Unlimited Chat History",
            "Global Cloud Sync",
            "Featured Agent Market",
            "Exclusive Premium Plugins",
            "Intelligent Internet Query",
            "Email and Community Forum",
          ],
          popular: false,
          icon: "star",
          color: "#8B5CF6",
          monthlyPriceId: null,
          yearlyPriceId: null,
        },
        {
          id: "premium-fallback",
          name: "Premium",
          description: "Designed for professional users who frequently use AI features",
          price: { monthly: 19.9, yearly: 238.8 },
          discount: 25,
          features: [
            "15,000,000 / Month",
            "GPT-4o mini",
            "Approx 21,100 messages",
            "DeepSeek R1",
            "Approx 5,800 messages",
            "See more models in the plan comparison",
            "Use file and knowledge base features in conversations",
            "File Storage: 2.0 GB",
            "Vector Storage: 10,000 entry",
            "Global mainstream model custom API services",
            "Unlimited Message Requests",
            "Unlimited Chat History",
            "Global Cloud Sync",
            "Featured Agent Market",
            "Exclusive Premium Plugins",
            "Intelligent Internet Query",
            "Priority Email Support",
          ],
          popular: true,
          icon: "crown",
          color: "#F59E0B",
          monthlyPriceId: null,
          yearlyPriceId: null,
        },
        {
          id: "ultimate-fallback",
          name: "Ultimate",
          description: "For heavy users requiring extensive AI complex conversations",
          price: { monthly: 39.9, yearly: 478.8 },
          discount: 25,
          features: [
            "35,000,000 / Month",
            "GPT-4o mini",
            "Approx 49,100 messages",
            "DeepSeek R1",
            "Approx 13,400 messages",
            "See more models in the plan comparison",
            "Use file and knowledge base features in conversations",
            "File Storage: 4.0 GB",
            "Vector Storage: 20,000 entry",
            "Global mainstream model custom API services",
            "Unlimited Message Requests",
            "Unlimited Chat History",
            "Global Cloud Sync",
            "Featured Agent Market",
            "Exclusive Premium Plugins",
            "Intelligent Internet Query",
            "Priority Chat and Email Support",
          ],
          popular: false,
          icon: "zap",
          color: "#EF4444",
          monthlyPriceId: null,
          yearlyPriceId: null,
        },
      ]

  // Usage statistics
  const creditsLimit = subscriptionInfo?.subscription?.monthlyCredits ?? 0;
  const creditsUsedRaw = subscriptionInfo?.usageQuota?.creditsUsed ?? 0
  const creditsUsed =
    (subscriptionInfo?.subscription?.monthlyCredits ?? 0) - (subscriptionInfo?.subscription?.balance ?? 0)

  const creditsRemaining = Math.max(creditsLimit - creditsUsed, 0)

  const fileUsedMBRaw = subscriptionInfo?.usageQuota?.fileStorageUsed ?? 0
  const fileLimitMBRaw =
    subscriptionInfo?.usageQuota?.fileStorageLimit ??
    (subscriptionInfo?.subscription?.fileStorageLimit ? subscriptionInfo.subscription.fileStorageLimit * 1024 : 0)
  const fileUsedMB = subscriptionInfo?.subscription?.fileStorageUsed ?? 0
  const fileUsedGB = fileLimitMBRaw > 0 ? fileUsedMB / 1024 : 0
  const fileLimitGB = fileLimitMBRaw / 1024
  const fileRemainingGB = ((subscriptionInfo?.subscription?.fileStorageRemaining ?? 0) / 1024).toFixed(2)

  const vectorUsedMBRaw = subscriptionInfo?.usageQuota?.vectorStorageUsed ?? 0
  const vectorLimitMB =
    subscriptionInfo?.usageQuota?.vectorStorageLimit ?? subscriptionInfo?.subscription?.vectorStorageLimit ?? 0
  const vectorUsedMB = Math.min(Math.max(vectorUsedMBRaw, 0), vectorLimitMB)
  const vectorRemainingMB = Math.max(vectorLimitMB - vectorUsedMB, 0)

  const usageStats = [
    {
      key: "credits",
      title: "Compute Credits",
      current: creditsUsed,
      limit: creditsLimit,
      remaining: creditsRemaining,
      unit: "credits",
      icon: <Zap size={20} />,
      color: theme.colorPrimary,
    },
    {
      key: "file",
      title: "File Storage",
      current: fileUsedGB,
      limit: fileLimitGB,
      remaining: fileRemainingGB,
      unit: "GB",
      icon: <FileText size={20} />,
      color: theme.colorSuccess,
    },
    {
      key: "vector",
      title: "Vector Storage",
      current: vectorUsedMB,
      limit: vectorLimitMB,
      remaining: vectorRemainingMB,
      unit: "MB",
      icon: <Database size={20} />,
      color: theme.colorWarning,
    },
  ]

  // Show loading state while fetching subscription data
  if (subscriptionLoading) {
    return (
      <div
        style={{
          padding: theme.paddingLG,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Center>
          <Spin size="large" />
          <p style={{ marginTop: theme.marginMD, color: theme.colorTextSecondary }}>
            Loading subscription information...
          </p>
        </Center>
      </div>
    )
  }

  if (hasActiveSubscription) {
    // Find current plan data based on subscription info
    const currentPlanData = plans.find((plan) => {
      // Try to match by plan name first
      if (currentPlan && plan.name.toLowerCase().includes(currentPlan.toLowerCase())) {
        return true;
      }
      // Fallback: match by credits or features if plan name doesn't match
      const currentCredits = subscriptionInfo?.subscription?.monthlyCredits || 0;
      if (currentCredits > 0) {
        // Map credits to plan tiers
        if (currentCredits <= 5000000 && plan.name.toLowerCase().includes('starter')) return true;
        if (currentCredits <= 15000000 && plan.name.toLowerCase().includes('premium')) return true;
        if (currentCredits > 15000000 && plan.name.toLowerCase().includes('ultimate')) return true;
      }
      return false;
    }) || plans[1]; // Default to Premium if not found

    // Show all plans in upgrade tab, but highlight current plan
    const upgradePlans = plans.filter((plan) => plan.name !== currentPlanData.name);

    const tabItems = [
      {
        key: "current",
        label: "Current Plan",
        children: (
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {/* Current Plan Card */}
            <Card
              style={{
                marginBottom: theme.marginXL,
                border: `2px solid ${theme.colorPrimary}`,
                borderRadius: theme.borderRadiusLG,
                background: `linear-gradient(135deg, ${theme.colorPrimaryBg} 0%, ${theme.colorBgContainer} 100%)`,
              }}
            >
              <div style={{ padding: theme.paddingLG }}>
                <div style={{ textAlign: "center", marginBottom: theme.marginLG }}>
                  <div
                    style={{
                      display: "inline-flex",
                      padding: theme.paddingLG,
                      backgroundColor: theme.colorPrimary,
                      borderRadius: "50%",
                      color: "white",
                      marginBottom: theme.marginMD,
                    }}
                  >
                    <Crown size={32} />
                  </div>
                  <h2
                    style={{
                      fontSize: theme.fontSizeHeading1,
                      fontWeight: theme.fontWeightStrong,
                      margin: "0 0 8px 0",
                      color: theme.colorText,
                    }}
                  >
                    {currentPlan || "Premium"} Plan
                  </h2>
                  <p
                    style={{
                      color: theme.colorTextSecondary,
                      fontSize: theme.fontSizeLG,
                      margin: 0,
                    }}
                  >
                    Next billing: {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString() : "N/A"}
                  </p>
                </div>

                <div style={{ textAlign: "center", marginBottom: theme.marginXL }}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={async () => {
                      try {
                        message.loading("Opening billing portal...", 0)
                        const result = await lambdaClient.stripe.createBillingPortalSession.mutate()
                        message.destroy()
                        if (result.success && result.url) {
                          window.location.href = result.url
                        } else {
                          message.error("Failed to open billing portal")
                        }
                      } catch (e) {
                        message.destroy()
                        message.error(e instanceof Error ? e.message : "Failed to open billing portal")
                      }
                    }}
                    style={{
                      borderRadius: theme.borderRadiusLG,
                      height: 48,
                      paddingInline: theme.paddingXL,
                    }}
                  >
                    Manage Subscription
                  </Button>
                </div>
              </div>
            </Card>

            {/* Usage Statistics */}
            <div style={{ marginBottom: theme.marginXL }}>
              <Typography.Title level={3} style={{ marginBottom: theme.marginLG, textAlign: "center" }}>
                Current Usage
              </Typography.Title>
              <Row gutter={[theme.marginLG, theme.marginLG]}>
                {usageStats.map((stat) => (
                  <Col xs={24} sm={12} lg={8} key={stat.key}>
                    <Card
                      style={{
                        height: "100%",
                        borderRadius: theme.borderRadiusLG,
                        border: `1px solid ${theme.colorBorderSecondary}`,
                      }}
                    >
                      <div style={{ padding: theme.paddingMD }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: theme.marginMD,
                          }}
                        >
                          <Typography.Text
                            style={{
                              fontSize: theme.fontSizeLG,
                              color: theme.colorText,
                              fontWeight: 600,
                            }}
                          >
                            {stat.title}
                          </Typography.Text>
                          <div style={{ color: stat.color }}>{stat.icon}</div>
                        </div>

                        <div style={{ marginBottom: theme.marginMD }}>
                          <Typography.Text
                            style={{
                              fontSize: theme.fontSizeHeading2,
                              fontWeight: theme.fontWeightStrong,
                              color: theme.colorText,
                            }}
                          >
                            {stat.current.toLocaleString()}
                          </Typography.Text>
                          <Typography.Text
                            style={{
                              fontSize: theme.fontSize,
                              color: theme.colorTextSecondary,
                              marginLeft: theme.marginXS,
                            }}
                          >
                            / {stat.limit.toLocaleString()} {stat.unit}
                          </Typography.Text>
                        </div>

                        <Progress
                          percent={stat.limit > 0 ? Math.min((stat.current / stat.limit) * 100, 100) : 0}
                          strokeColor={{
                            "0%": theme.colorSuccess,
                            "70%": theme.colorWarning,
                            "100%": theme.colorError,
                          }}
                          trailColor={theme.colorBgLayout}
                          strokeWidth={8}
                          showInfo={false}
                          style={{ marginBottom: theme.marginSM }}
                        />

                        <Typography.Text
                          style={{
                            fontSize: theme.fontSizeSM,
                            color: theme.colorTextSecondary,
                          }}
                        >
                          Remaining: {stat.remaining.toLocaleString()} {stat.unit}
                        </Typography.Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>

            {/* Plan Features */}
            <Card style={{ borderRadius: theme.borderRadiusLG }}>
              <Typography.Title level={4} style={{ marginBottom: theme.marginLG }}>
                Your Plan Features
              </Typography.Title>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: theme.marginMD,
                }}
              >
                {currentPlanData.features.slice(0, 8).map((feature: string, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: theme.marginSM,
                      padding: theme.paddingSM,
                      backgroundColor: theme.colorBgLayout,
                      borderRadius: theme.borderRadius,
                    }}
                  >
                    <CheckCircle size={16} style={{ color: theme.colorSuccess, flexShrink: 0 }} />
                    <span style={{ color: theme.colorText, fontSize: theme.fontSizeSM }}>{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ),
      },
      {
        key: "upgrade",
        label: "Upgrade",
        children: (
          <div>
            {/* Billing Cycle Toggle */}
            <Center style={{ marginBottom: theme.marginXL }}>
              <div
                style={{
                  display: "flex",
                  backgroundColor: theme.colorBgLayout,
                  borderRadius: theme.borderRadiusLG,
                  padding: 4,
                  border: `1px solid ${theme.colorBorder}`,
                }}
              >
                <Button
                  type={billingCycle === "monthly" ? "primary" : "text"}
                  onClick={() => setBillingCycle("monthly")}
                  style={{
                    borderRadius: theme.borderRadius,
                    border: "none",
                    height: 40,
                    paddingInline: theme.paddingLG,
                  }}
                >
                  Monthly
                </Button>
                <Button
                  type={billingCycle === "yearly" ? "primary" : "text"}
                  onClick={() => setBillingCycle("yearly")}
                  style={{
                    borderRadius: theme.borderRadius,
                    border: "none",
                    height: 40,
                    paddingInline: theme.paddingLG,
                  }}
                >
                  Yearly
                  <span
                    style={{
                      marginLeft: theme.marginXS,
                      backgroundColor: theme.colorSuccess,
                      color: "white",
                      padding: `2px ${theme.paddingSM}px`,
                      borderRadius: theme.borderRadius,
                      fontSize: theme.fontSizeSM,
                      fontWeight: 600,
                    }}
                  >
                    25% off
                  </span>
                </Button>
              </div>
            </Center>

                         {/* All Plans */}
             <div style={{ marginBottom: theme.marginLG }}>
               <Typography.Title level={4} style={{ marginBottom: theme.marginMD, textAlign: 'center' }}>
                 All Available Plans
               </Typography.Title>
               <Typography.Text style={{ color: theme.colorTextSecondary, textAlign: 'center', display: 'block' }}>
                 Choose the plan that best fits your needs. Your current plan is highlighted below.
               </Typography.Text>
             </div>
             
             {upgradePlans.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                  gap: theme.marginXL,
                  maxWidth: 1200,
                  margin: "0 auto",
                }}
              >
                {upgradePlans.map((plan: any, index: number) => (
                <Card
                  key={plan.id || index}
                  style={{
                    borderRadius: theme.borderRadiusLG,
                    border: plan.popular ? `2px solid ${plan.color}` : `1px solid ${theme.colorBorder}`,
                    position: "relative",
                    overflow: "visible",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {plan.popular && (
                    <div
                      style={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: plan.color,
                        color: "white",
                        padding: `${theme.paddingXS}px ${theme.paddingLG}px`,
                        borderRadius: theme.borderRadiusLG,
                        fontSize: theme.fontSizeSM,
                        fontWeight: 600,
                        zIndex: 1,
                      }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div style={{ padding: theme.paddingXL, display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Plan Header */}
                    <div style={{ textAlign: "center", marginBottom: theme.marginXL }}>
                      <div
                        style={{
                          display: "inline-flex",
                          padding: theme.paddingMD,
                          backgroundColor: `${plan.color}15`,
                          borderRadius: theme.borderRadius,
                          color: plan.color,
                          marginBottom: theme.marginMD,
                        }}
                      >
                        {plan.icon === "crown" ? (
                          <Crown size={24} />
                        ) : plan.icon === "zap" ? (
                          <Zap size={24} />
                        ) : (
                          <Star size={24} />
                        )}
                      </div>
                      <h3
                        style={{
                          fontSize: theme.fontSizeHeading2,
                          fontWeight: theme.fontWeightStrong,
                          margin: "0 0 8px 0",
                          color: theme.colorText,
                        }}
                      >
                        {plan.name}
                      </h3>
                      <p
                        style={{
                          color: theme.colorTextSecondary,
                          fontSize: theme.fontSize,
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: "center", marginBottom: theme.marginXL }}>
                      <div
                        style={{
                          fontSize: theme.fontSizeHeading1,
                          fontWeight: theme.fontWeightStrong,
                          color: theme.colorText,
                          marginBottom: theme.marginXS,
                        }}
                      >
                        ${plan.price?.[billingCycle] || 0}
                        <span
                          style={{
                            fontSize: theme.fontSizeLG,
                            fontWeight: 400,
                            color: theme.colorTextSecondary,
                          }}
                        >
                          / Month {billingCycle === "yearly" ? "(Yearly)" : ""}
                        </span>
                      </div>
                      {billingCycle === "yearly" && (
                        <div
                          style={{
                            fontSize: theme.fontSizeSM,
                            color: theme.colorSuccess,
                          }}
                        >
                          ${(plan.price.yearly / 12).toFixed(1)} / Year • 25% off
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div style={{ marginBottom: theme.marginXL, flex: 1 }}>
                      <Typography.Title level={5} style={{ marginBottom: theme.marginMD }}>
                        Compute Credits
                      </Typography.Title>
                      <div style={{ marginBottom: theme.marginLG }}>
                        {plan.features.slice(0, 6).map((feature: string, featureIndex: number) => (
                          <div
                            key={featureIndex}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: theme.marginSM,
                              marginBottom: theme.marginSM,
                              fontSize: theme.fontSizeSM,
                            }}
                          >
                            <CheckCircle size={14} style={{ color: theme.colorSuccess, flexShrink: 0, marginTop: 2 }} />
                            <span style={{ color: theme.colorText, lineHeight: 1.4 }}>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Typography.Title level={5} style={{ marginBottom: theme.marginMD }}>
                        Files and Knowledge Base
                      </Typography.Title>
                      <div style={{ marginBottom: theme.marginLG }}>
                        {plan.features.slice(6, 9).map((feature: string, featureIndex: number) => (
                          <div
                            key={featureIndex}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: theme.marginSM,
                              marginBottom: theme.marginSM,
                              fontSize: theme.fontSizeSM,
                            }}
                          >
                            <CheckCircle size={14} style={{ color: theme.colorSuccess, flexShrink: 0, marginTop: 2 }} />
                            <span style={{ color: theme.colorText, lineHeight: 1.4 }}>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      type={plan.popular ? "primary" : "default"}
                      size="large"
                      block
                      loading={checkoutLoading === plan.id}
                      disabled={!plan.monthlyPriceId || !plan.yearlyPriceId}
                      onClick={() => handleCheckout(plan)}
                      style={{
                        height: 48,
                        borderRadius: theme.borderRadiusLG,
                        backgroundColor: plan.popular ? plan.color : undefined,
                        borderColor: plan.popular ? plan.color : undefined,
                        fontWeight: 600,
                        marginTop: "auto",
                      }}
                    >
                      {plan.monthlyPriceId && plan.yearlyPriceId 
                        ? (hasActiveSubscription ? "Upgrade Now" : "Get Started") 
                        : "Contact Sales"}
                    </Button>
                  </div>
                </Card>
                              ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: theme.paddingXL }}>
                <Typography.Title level={4} style={{ color: theme.colorTextSecondary }}>
                  You're already on the highest tier plan!
                </Typography.Title>
                <Typography.Text style={{ color: theme.colorTextSecondary }}>
                  Contact our sales team if you need a custom enterprise solution.
                </Typography.Text>
              </div>
            )}
          </div>
        ),
      },
    ]

    return (
      <div
        style={{
          padding: theme.paddingLG,
          width: "100%",
          height: "100%",
          overflow: "auto",
          backgroundColor: theme.colorBgLayout,
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
              textAlign: "center",
            }}
          >
            Plans & Pricing
          </h1>
          <p
            style={{
              fontSize: theme.fontSizeLG,
              color: theme.colorTextSecondary,
              textAlign: "center",
              maxWidth: 600,
            }}
          >
            Launch Self-Efficacy. Rediscover Passion of Creation.
          </p>
        </Center>

        {/* Tabs */}
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <Tabs
            defaultActiveKey="current"
            items={tabItems}
            centered
            size="large"
            className={styles.customTabs}
          />
        </div>
      </div>
    )
  }

  // Show pricing plans for users without active subscriptions
  return (
    <div
      style={{
        padding: theme.paddingLG,
        width: "100%",
        height: "100%",
        overflow: "auto",
        backgroundColor: theme.colorBgLayout,
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
            textAlign: "center",
          }}
        >
          Plans & Pricing
        </h1>
        <p
          style={{
            fontSize: theme.fontSizeLG,
            color: theme.colorTextSecondary,
            textAlign: "center",
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
            textAlign: "center",
            maxWidth: 500,
          }}
        >
          Sign up and get a free trial of GPT / Claude / Gemini 450,000 Credits. No credit card required.
        </p>
        <Button
          type="primary"
          size="large"
          style={{
            marginTop: theme.marginLG,
            height: 48,
            paddingInline: theme.paddingXL,
            borderRadius: theme.borderRadiusLG,
          }}
        >
          Claim Your Free Trial Now
        </Button>
      </Center>

      {/* Billing Cycle Toggle */}
      <Center style={{ marginBottom: theme.marginXL }}>
        <div
          style={{
            display: "flex",
            backgroundColor: theme.colorBgContainer,
            borderRadius: theme.borderRadiusLG,
            padding: 4,
            border: `1px solid ${theme.colorBorder}`,
          }}
        >
          <Button
            type={billingCycle === "monthly" ? "primary" : "text"}
            onClick={() => setBillingCycle("monthly")}
            style={{
              borderRadius: theme.borderRadius,
              border: "none",
              height: 40,
              paddingInline: theme.paddingLG,
            }}
          >
            Monthly
          </Button>
          <Button
            type={billingCycle === "yearly" ? "primary" : "text"}
            onClick={() => setBillingCycle("yearly")}
            style={{
              borderRadius: theme.borderRadius,
              border: "none",
              height: 40,
              paddingInline: theme.paddingLG,
            }}
          >
            Yearly
            <span
              style={{
                marginLeft: theme.marginXS,
                backgroundColor: theme.colorSuccess,
                color: "white",
                padding: `2px ${theme.paddingSM}px`,
                borderRadius: theme.borderRadius,
                fontSize: theme.fontSizeSM,
                fontWeight: 600,
              }}
            >
              Save up to 25%
            </span>
          </Button>
        </div>
      </Center>

      {/* Pricing Plans */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: theme.marginXL,
          justifyContent: "center",
          marginBottom: theme.marginXL,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {plans.map((plan: any, index: number) => (
          <Card
            key={plan.id || index}
            style={{
              borderRadius: theme.borderRadiusLG,
              border: plan.popular ? `2px solid ${plan.color}` : `1px solid ${theme.colorBorder}`,
              position: "relative",
              overflow: "visible",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {plan.popular && (
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: plan.color,
                  color: "white",
                  padding: `${theme.paddingXS}px ${theme.paddingLG}px`,
                  borderRadius: theme.borderRadiusLG,
                  fontSize: theme.fontSizeSM,
                  fontWeight: 600,
                  zIndex: 1,
                }}
              >
                Most Popular
              </div>
            )}

            <div style={{ padding: theme.paddingXL }}>
              {/* Plan Header */}
              <div style={{ textAlign: "center", marginBottom: theme.marginXL }}>
                <div
                  style={{
                    display: "inline-flex",
                    padding: theme.paddingMD,
                    backgroundColor: `${plan.color}15`,
                    borderRadius: theme.borderRadius,
                    color: plan.color,
                    marginBottom: theme.marginMD,
                  }}
                >
                  {plan.icon === "crown" ? (
                    <Crown size={24} />
                  ) : plan.icon === "zap" ? (
                    <Zap size={24} />
                  ) : (
                    <Star size={24} />
                  )}
                </div>
                <h3
                  style={{
                    fontSize: theme.fontSizeHeading2,
                    fontWeight: theme.fontWeightStrong,
                    margin: "0 0 8px 0",
                    color: theme.colorText,
                  }}
                >
                  {plan.name}
                </h3>
                <p
                  style={{
                    color: theme.colorTextSecondary,
                    fontSize: theme.fontSize,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div style={{ textAlign: "center", marginBottom: theme.marginXL }}>
                <div
                  style={{
                    fontSize: theme.fontSizeHeading1,
                    fontWeight: theme.fontWeightStrong,
                    color: theme.colorText,
                    marginBottom: theme.marginXS,
                  }}
                >
                  ${plan.price?.[billingCycle] || 0}
                  <span
                    style={{
                      fontSize: theme.fontSizeLG,
                      fontWeight: 400,
                      color: theme.colorTextSecondary,
                    }}
                  >
                    / Month {billingCycle === "yearly" ? "(Yearly)" : ""}
                  </span>
                </div>
                {billingCycle === "yearly" && (
                  <div
                    style={{
                      fontSize: theme.fontSizeSM,
                      color: theme.colorSuccess,
                    }}
                  >
                    ${(plan.price.yearly / 12).toFixed(1)} / Year • 25% off
                  </div>
                )}
              </div>

              {/* Features */}
              <div style={{ marginBottom: theme.marginXL }}>
                <Typography.Title level={5} style={{ marginBottom: theme.marginMD }}>
                  Compute Credits
                </Typography.Title>
                <div style={{ marginBottom: theme.marginLG }}>
                  {plan.features.slice(0, 6).map((feature: string, featureIndex: number) => (
                    <div
                      key={featureIndex}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: theme.marginSM,
                        marginBottom: theme.marginSM,
                        fontSize: theme.fontSizeSM,
                      }}
                    >
                      <CheckCircle size={14} style={{ color: theme.colorSuccess, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ color: theme.colorText, lineHeight: 1.4 }}>{feature}</span>
                    </div>
                  ))}
                </div>

                <Typography.Title level={5} style={{ marginBottom: theme.marginMD }}>
                  Files and Knowledge Base
                </Typography.Title>
                <div style={{ marginBottom: theme.marginLG }}>
                  {plan.features.slice(6, 9).map((feature: string, featureIndex: number) => (
                    <div
                      key={featureIndex}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: theme.marginSM,
                        marginBottom: theme.marginSM,
                        fontSize: theme.fontSizeSM,
                      }}
                    >
                      <CheckCircle size={14} style={{ color: theme.colorSuccess, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ color: theme.colorText, lineHeight: 1.4 }}>{feature}</span>
                    </div>
                  ))}
                </div>

             
              </div>

              {/* CTA Button */}
              <Button
                type={plan.popular ? "primary" : "default"}
                size="large"
                block
                loading={checkoutLoading === plan.id}
                disabled={!plan.monthlyPriceId || !plan.yearlyPriceId}
                onClick={() => handleCheckout(plan)}
                style={{
                  height: 48,
                  borderRadius: theme.borderRadiusLG,
                  backgroundColor: plan.popular ? plan.color : undefined,
                  borderColor: plan.popular ? plan.color : undefined,
                  fontWeight: 600,
                }}
              >
                {plan.monthlyPriceId && plan.yearlyPriceId 
                  ? (hasActiveSubscription ? "Upgrade Now" : "Get Started") 
                  : "Contact Sales"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default PricingPage
