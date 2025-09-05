'use client';

import { mailTo } from '@/const/url';
import { useAffiliateStore } from '@/store/affiliate/store';
import { useUserStore } from '@/store/user';
import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useRouter } from 'next/navigation';
import React from 'react';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    min-height: 100vh;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #fdf2f8 100%);
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: auto;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
  `,
  logo: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  logoIcon: css`
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #8b5cf6 0%, #f59e0b 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  `,
  logoText: css`
    font-size: 20px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  headerActions: css`
    display: flex;
    gap: 8px;
  `,
  mainContent: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 24px 80px;
  `,
  contentWrapper: css`
    max-width: 1200px;
    width: 100%;
    text-align: center;
  `,
  welcomeSection: css`
    margin-bottom: 48px;
  `,
  welcomeTitle: css`
    font-size: 36px;
    font-weight: 700;
    color: ${token.colorText};
    margin-bottom: 16px;
    line-height: 1.2;
  `,
  highlightText: css`
    color: #f59e0b;
  `,
  subtitle: css`
    font-size: 24px;
    color: ${token.colorText};
    margin-bottom: 8px;
    font-weight: 500;
  `,
  description: css`
    font-size: 20px;
    color: ${token.colorTextSecondary};
    margin-bottom: 24px;
  `,
  subDescription: css`
    color: ${token.colorTextTertiary};
    font-size: 16px;
  `,
  cardsGrid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 48px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 16px;
    padding: 32px 24px;
    position: relative;
    border: 2px solid transparent;
    background: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
    }
  `,
  selectedCard: css`
    border-color: #10b981;
    background: #f0fdf4;
  `,
  checkmark: css`
    position: absolute;
    top: 16px;
    right: 16px;
    width: 24px;
    height: 24px;
    background: #10b981;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: bold;
  `,
  cardContent: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  `,
  cardIcon: css`
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
  `,
  cardTitle: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
    line-height: 1.4;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `,
  actionButtons: css`
    display: flex;
    justify-content: center;
    gap: 16px;
  `,
  nextButton: css`
    background: #1f2937 !important;
    border-color: #1f2937 !important;
    color: white !important;
    height: 48px;
    padding: 0 32px;
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;

    &:hover {
      background: #374151 !important;
      border-color: #374151 !important;
    }
  `,
  skipButton: css`
    color: ${token.colorTextTertiary} !important;
    height: 48px;
    padding: 0 32px;
    font-size: 16px;
    font-weight: 500;

    &:hover {
      color: ${token.colorText} !important;
    }
  `,
  footer: css`
    text-align: center;
    font-size: 12px;
    color: ${token.colorTextTertiary};
    padding-bottom: 24px;
    display: flex;
    justify-content: center;
    gap: 24px;
  `,
  techCard: css`
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  `,
  artsCard: css`
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  `,
  productCard: css`
    background: linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%);
  `,
  educationCard: css`
    background: white;
  `,
  writingCard: css`
    background: white;
  `,
  emotionCard: css`
    background: white;
  `,
}));

const OnboardingPage = ({
  activeTab,
  setActiveTab,
  interests,
  selectedInterests,
  setSelectedInterests,
}: {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  interests: {
    id: string;
    title: string;
    emoji: string;
    bgClass: string;
    value: string;
  }[];
  selectedInterests: string[];
  setSelectedInterests: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const { styles } = useStyles();

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId],
    );
  };

  const router = useRouter();
  const user = useUserStore((state)=>state.user)
  const updateUserOnboarded = useAffiliateStore((state) => state.updateUserOnboarded);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Klyno AI</span>
        </div>
     
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Welcome Message */}
          <div className={styles.welcomeSection}>
            <h1 className={styles.welcomeTitle}>
              Hello! <span className={styles.highlightText}>{user?.fullName || user?.username || user?.email}</span>
            </h1>
            <h2 className={styles.subtitle}>I am Klyno AI, your personal intelligent assistant.</h2>
            <p className={styles.description}>
              Before we begin, why not tell me about your areas of interest?
            </p>
            <p className={styles.subDescription}>
              Take a minute to help me understand you better, and I will provide you with more
              personalized services.
            </p>
          </div>

          {/* Interest Cards Grid */}
          <div className={styles.cardsGrid}>
            {interests.map((interest) => (
              <div
                key={interest.id}
                className={`${styles.card} ${interest.bgClass} ${
                  selectedInterests.includes(interest.id) ? styles.selectedCard : ''
                }`}
                onClick={() => toggleInterest(interest.id)}
              >
                {selectedInterests.includes(interest.id) && (
                  <div className={styles.checkmark}>✓</div>
                )}
                <div className={styles.cardContent}>
                  <div className={styles.cardIcon}>{interest.emoji}</div>
                  <h3 className={styles.cardTitle}>{interest.title}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <Button
              size="large"
              className={styles.nextButton}
              onClick={() => setActiveTab('onboard-assistant')}
              disabled={selectedInterests.length === 0}
            >
              Next
            </Button>
            <Button size="large" type="text" className={styles.skipButton} onClick={()=>{
              router.push('/chat');
              updateUserOnboarded({ userId: user?.id || '' });
            }}>
              Skip
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span>© 2025 Klyno AI</span>
        <span onClick={()=>{window.open(mailTo("support@ascensionhostings.com"), '_blank')}}>Email Support</span>
      </div>
    </div>
  );
};

export default OnboardingPage;
