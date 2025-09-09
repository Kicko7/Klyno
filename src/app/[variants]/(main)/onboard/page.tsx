'use client';

import { createStyles } from 'antd-style';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAffiliateStore } from '@/store/affiliate/store';
import { useUserStore } from '@/store/user';

import Loading from '../chat/loading';
import OnBoard from './components/OnBoard';
import OnBoardAssistant from './components/OnBoardAssistant';

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

export default function Onboard() {
  const [activeTab, setActiveTab] = useState<string>('onboard');
  const { styles } = useStyles();

  const interests = [
    {
      id: 'coding',
      title: 'TECHNOLOGY & DEVELOPMENT',
      emoji: '👨‍💻',
      bgClass: styles.techCard,
      value: 'coding',
    },
    {
      id: 'design',
      title: 'ARTS & DESIGN',
      emoji: '🎨',
      bgClass: styles.artsCard,
      value: 'design',
    },
    {
      id: 'marketing',
      title: 'PRODUCT & MARKETING',
      emoji: '📢',
      bgClass: styles.productCard,
      value: 'marketing',
    },
    {
      id: 'education',
      title: 'EDUCATION & ACADEMIC RESEARCH',
      emoji: '🎓',
      bgClass: styles.educationCard,
      value: 'education',
    },
    {
      id: 'writing',
      title: 'WRITING & COPYEDITING',
      emoji: '✍️',
      bgClass: styles.writingCard,
      value: 'writing',
    },
    {
      id: 'emotion',
      title: 'EMOTION & COMPANIONSHIP',
      emoji: '🤡',
      bgClass: styles.emotionCard,
      value: 'emotion',
    },
  ];

  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'coding',
    'design',
    'marketing',
  ]);

  // Load user from store
  const user = useUserStore((state) => state.user);

  const handleNext = () => {
    setActiveTab('onboard-assistant');
  };

  const [affiliateRef, setAffiliateRef] = useState<string | null>(null);
  const addAffiliateRef = useAffiliateStore((state) => state.addAffiliateRef);
  const updateUserAffiliateRef = useAffiliateStore((state) => state.updateUserAffiliateRef);

  useEffect(() => {
    const affiliateRef = localStorage.getItem('affiliateRef');
    setAffiliateRef(affiliateRef);
  }, []);

  useEffect(() => {
    const handleAffiliateRef = async () => {
      if (user && affiliateRef) {
        const affiliate = await addAffiliateRef({ link: affiliateRef, userId: user.id });
        if (affiliate && affiliate?.id) {
          updateUserAffiliateRef({ affiliateId: affiliate?.id, userId: user.id });
          localStorage.removeItem('affiliateRef');
          setAffiliateRef(null);
        }
      }
    };
    handleAffiliateRef();
  }, [user]);

  // Show loading state while user is being loaded
  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.mainContent}>
          <div className={styles.contentWrapper}>
            <div style={{ textAlign: 'center' }}>
              <div className={styles.logoIcon}>🤯</div>
              <div style={{ marginTop: '16px', fontSize: '18px', color: '#666' }}>Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      {!user ? (
        <Loading />
      ) : activeTab === 'onboard-assistant' ? (
        <OnBoardAssistant
          selectedInterests={selectedInterests}
          setActiveTab={setActiveTab}
          handleNext={handleNext}
          activeTab={activeTab}
        />
      ) : (
        <OnBoard
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          interests={interests}
          selectedInterests={selectedInterests}
          setSelectedInterests={setSelectedInterests}
        />
      )}
    </div>
  );
}
