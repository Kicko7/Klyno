'use client';

import { ActionIcon } from '@lobehub/ui';
import { Card, message } from 'antd';
import { Crown, Sparkles, Star, X, Zap } from 'lucide-react';
import { memo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useUserSubscription } from '@/hooks/useUserSubscription';

const FEATURES = [
  { icon: Zap, text: 'Unlimited AI conversations' },
  { icon: Star, text: 'Priority support' },
  { icon: Sparkles, text: 'Advanced AI models' },
];

interface UpgradePopupProps {
  onClose?: () => void;
}

const UpgradePopup = memo<UpgradePopupProps>(({ onClose }) => {
  const { t } = useTranslation('common');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { hasActiveSubscription } = useUserSubscription();
  const router = useRouter();

  // Don't show popup if user already has active subscription
  if (hasActiveSubscription) return null;

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true);
      message.loading('Redirecting to upgrade page...', 0);
      
      // Redirect to pricing page
      router.push('/pricing');
    } catch (error) {
      console.error('Error redirecting to upgrade:', error);
      message.error('Failed to redirect to upgrade page');
    } finally {
      setIsUpgrading(false);
      message.destroy();
    }
  };

  return (
    <div 
      style={{ 
        margin: '12px',
        animation: 'slideUp 0.3s ease-out',
      }}
      className="upgrade-popup-container"
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-2px);
            }
          }
          
          .upgrade-popup-container .floating-crown {
            animation: float 2s ease-in-out infinite;
          }
        `
      }} />
      
      <Card
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
        }}
        bodyStyle={{ padding: '20px' }}
      >
      {/* Close button */}
      {onClose && (
        <ActionIcon
          icon={X}
          onClick={onClose}
          size={16}
          style={{
            position: 'absolute',
            right: '8px',
            top: '8px',
            color: 'rgba(255, 255, 255, 0.7)',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            zIndex: 1,
          }}
          title="Close"
        />
      )}

      <Flexbox gap={12} style={{ color: 'white' }}>
        {/* Header */}
        <Flexbox align="center" gap={8} horizontal>
          <Crown size={20} style={{ color: '#FFD700' }} className="floating-crown" />
          <div style={{ fontWeight: 600, fontSize: '16px' }}>
            Upgrade to Pro
          </div>
        </Flexbox>

        {/* Description */}
        <div style={{ 
          fontSize: '14px', 
          opacity: 0.9,
          lineHeight: '1.4',
          marginBottom: '4px'
        }}>
          Unlock unlimited AI conversations and premium features
        </div>

        {/* Features */}
        <Flexbox gap={8}>
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Flexbox key={index} align="center" gap={8} horizontal>
                <Icon size={14} style={{ color: '#FFD700', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', opacity: 0.9 }}>
                  {feature.text}
                </span>
              </Flexbox>
            );
          })}
        </Flexbox>

        {/* CTA Button */}
        <button
          onClick={handleUpgrade}
          disabled={isUpgrading}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            color: 'white',
            cursor: isUpgrading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            marginTop: '8px',
            opacity: isUpgrading ? 0.7 : 1,
            padding: '12px 16px',
            transition: 'all 0.2s ease',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            if (!isUpgrading) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isUpgrading) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {isUpgrading ? 'Redirecting...' : 'Upgrade Now'}
        </button>

        {/* Footer text */}
        <div style={{ 
          fontSize: '11px', 
          opacity: 0.7,
          textAlign: 'center',
          marginTop: '4px'
        }}>
          Cancel anytime • 30-day money back guarantee
        </div>
      </Flexbox>
    </Card>
    </div>
  );
});

UpgradePopup.displayName = 'UpgradePopup';

export default UpgradePopup;
