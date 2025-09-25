'use client';

import { ArrowLeftOutlined, CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Spin, message } from 'antd';
import { createStyles, useTheme } from 'antd-style';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { mailTo } from '@/const/url';
import { useDiscoverStore } from '@/store/discover';
import { useSessionStore } from '@/store/session';
import { DiscoverAssistantItem } from '@/types/discover';
import { useUserStore } from '@/store/user/store';
import { useAffiliateStore } from '@/store/affiliate/store';

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
    padding: 0 24px 80px;
  `,
  contentWrapper: css`
    max-width: 1200px;
    margin: 0 auto;
  `,
  backButton: css`
    margin-bottom: 32px;
    color: ${token.colorTextTertiary};

    &:hover {
      color: ${token.colorText};
    }
  `,
  titleSection: css`
    margin-bottom: 32px;
  `,
  mainTitle: css`
    font-size: 28px;
    font-weight: 700;
    color: ${token.colorText};
    margin-bottom: 16px;
    line-height: 1.3;
  `,
  subtitle: css`
    color: ${token.colorTextTertiary};
    font-size: 16px;
  `,
  loadingContainer: css`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
  `,
  assistantsGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin-bottom: 48px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 12px;
    padding: 24px;
    position: relative;
    border: 2px solid transparent;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `,
  selectedCard: css`
    border-color: #10b981;
  `,
  checkmark: css`
    position: absolute;
    top: 16px;
    right: 16px;
    width: 20px;
    height: 20px;
    background: #10b981;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    font-weight: bold;
  `,
  plusIcon: css`
    position: absolute;
    top: 16px;
    right: 16px;
    width: 20px;
    height: 20px;
    background: ${token.colorTextTertiary};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    font-weight: bold;
  `,
  cardContent: css`
    display: flex;
    align-items: flex-start;
    gap: 16px;
  `,
  cardIcon: css`
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    background: ${token.colorFillTertiary};
    color: ${token.colorText};
  `,
  cardText: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
  `,
  cardTitle: css`
    font-size: 16px;
    font-weight: 600;
    color: ${token.colorText};
    margin-bottom: 8px;
    line-height: 1.4;
    word-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    max-height: 2.8em; /* 2 lines * 1.4 line-height */
  `,
  cardDescription: css`
    color: ${token.colorTextSecondary};
    font-size: 14px;
    margin-bottom: 12px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    max-height: 2.8em; /* 2 lines * 1.4 line-height */
  `,
  tagsContainer: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  tag: css`
    font-size: 12px;
    padding: 2px 8px;
    background: ${token.colorFillTertiary};
    color: ${token.colorTextTertiary};
    border: none;
    border-radius: 12px;
  `,
  actionButtons: css`
    display: flex;
    gap: 16px;
  `,
  addButton: css`
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
}));

const OnBoardAssistant = ({
  selectedInterests,
  setActiveTab,
  handleNext,
  activeTab,
}: {
  selectedInterests: string[];
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  handleNext: () => void;
  activeTab: string;
}) => {
  const { styles } = useStyles();
  const [selectedAssistants, setSelectedAssistants] = useState<string[]>([]);
  const [filteredAssistants, setFilteredAssistants] = useState<DiscoverAssistantItem[]>([]);
  const [isCreatingSessions, setIsCreatingSessions] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const useAssistantList = useDiscoverStore((s) => s.useAssistantList);
  const createSession = useSessionStore((s) => s.createSession);

  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds

  const getAssistantsPerInterest = (interestCount: number) => {
    if (interestCount === 1) return 6;
    if (interestCount === 2) return 4;
    if (interestCount >= 3) return Math.floor(8 / interestCount);
    return 6;
  };

  const assistantsPerInterest = getAssistantsPerInterest(selectedInterests.length);
  const maxAssistants =
    selectedInterests.length === 1
      ? 8
      : Math.min(10, assistantsPerInterest * selectedInterests.length);

  // Fetch assistants for each interest
  const assistantQueries = selectedInterests.map((interest) => {
    console.log('Searching for interest:', interest);
    const results = useAssistantList({
      pageSize: assistantsPerInterest,
      page: 1,
      order: 'desc',
      q: interest,
    });

    console.log('Query results for', interest, ':', results.data?.items?.length || 0, 'items');
    return results;
  });

  const isLoading = assistantQueries.some((query) => query.isLoading);

  // Process and set filtered assistants with retry logic
  const user = useUserStore((state) => state?.user);
  const updateUserOnboarded = useAffiliateStore((state) => state?.updateUserOnboarded);
  useEffect(() => {
    if (selectedInterests.length === 0) return;

    console.log('Processing assistant queries... Retry count:', retryCount);
    const allResults = assistantQueries
      .filter((query) => query.data?.items)
      .flatMap((query) => query.data!.items);

    console.log('All results before deduplication:', allResults.length);

    if (allResults.length > 0) {
      // Create a Map for better deduplication performance
      const uniqueMap = new Map();

      allResults.forEach((assistant) => {
        // Use identifier as the primary key for uniqueness
        const key = assistant.identifier;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, assistant);
        }
      });

      const uniqueResults = Array.from(uniqueMap.values());
      const finalResults = uniqueResults.slice(0, maxAssistants);

      if (finalResults.length === 0) {
        // No results after filtering, retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          console.log(`No results found after filtering, retrying in ${retryDelay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setRetryTrigger(Date.now());
          }, retryDelay);
        } else {
          // console.log('Max retries reached, no results found');
          setFilteredAssistants([]);
        }
      } else {
        // console.log('Final filtered assistants:', finalResults.length);
        setFilteredAssistants(finalResults);
        // Reset retry count on success
        setRetryCount(0);
      }
    } else {
      // console.log('No results found at all, setting empty array');
      // No results at all, retry if we haven't exceeded max retries
      if (retryCount < maxRetries && !isLoading) {
        console.log(`No results found, retrying in ${retryDelay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setRetryTrigger(Date.now());
        }, retryDelay);
      } else if (retryCount >= maxRetries) {
        // console.log('Max retries reached, no results found');
        setFilteredAssistants([]);
      }
    }
  }, [ maxAssistants, selectedInterests, retryTrigger, retryCount, isLoading]);

  // Reset retry count when selectedInterests change
  useEffect(() => {
    setRetryCount(0);
    setRetryTrigger(0);
  }, [selectedInterests]);

  // Auto-select first 3 assistants when data loads
  useEffect(() => {
    if (filteredAssistants.length > 0 && selectedAssistants.length === 0) {
      const firstThree = filteredAssistants.slice(0, 3).map((item) => item.identifier);
      setSelectedAssistants(firstThree);
    }
  }, [filteredAssistants, selectedAssistants.length]);

  const toggleAssistant = (assistantId: string) => {
    setSelectedAssistants((prev) =>
      prev.includes(assistantId) ? prev.filter((id) => id !== assistantId) : [...prev, assistantId],
    );
  };

  const getAssistantIcon = (assistant: DiscoverAssistantItem) => {
    // Default icons based on category
    const categoryIcons: Record<string, string> = {
      programming: '💻',
      design: '🎨',
      marketing: '📢',
      education: '🎓',
      copywriting: '✍️',
      general: '🤖',
      academic: '📚',
      career: '💼',
      emotions: '❤️',
      entertainment: '🎭',
      games: '🎮',
      life: '🌟',
      office: '📊',
      translation: '🌐',
    };

    return categoryIcons[assistant.category || 'general'] || '🤖';
  };

  const getAssistantTags = (assistant: DiscoverAssistantItem) => {
    const tags = [];

    if (assistant.category) {
      tags.push(assistant.category);
    }

    if (assistant.pluginCount > 0) {
      tags.push(`${assistant.pluginCount} Plugins`);
    }

    if (assistant.knowledgeCount > 0) {
      tags.push(`${assistant.knowledgeCount} Knowledge`);
    }

    if (assistant.tokenUsage > 0) {
      tags.push(`${assistant.tokenUsage} Tokens`);
    }

    return tags.slice(0, 4); // Limit to 4 tags
  };

  const handleAddAssistant = async () => {
    if (selectedAssistants.length === 0) {
      message.error('Please select at least one assistant');
      return;
    }

    setIsCreatingSessions(true);

    try {
      // Get the selected assistant objects
      const selectedAssistantObjects = filteredAssistants.filter((assistant) =>
        selectedAssistants.includes(assistant.identifier),
      );

      // Create sessions for each selected assistant
      const sessionPromises = selectedAssistantObjects.map(async (assistant) => {
        const sessionData = {
          config: {
            ...assistant.config,
            model: assistant.config?.model || 'gpt-3.5-turbo',
            provider: assistant.config?.provider || 'openai',
            systemRole:
              assistant.config?.systemRole ||
              assistant.description ||
              'You are a helpful AI assistant.',
          },
          meta: {
            title: assistant.title,
            description: assistant.description,
            avatar: assistant.avatar,
            backgroundColor: assistant.backgroundColor,
            tags: assistant.tags || [],
          },
        };

        return createSession(sessionData, false);
      });

      // Wait for all sessions to be created
      const sessionIds = await Promise.all(sessionPromises);

      message.success(`Successfully created ${sessionIds.length} assistant sessions!`);

      // Navigate to the main chat page or first session
      updateUserOnboarded({ userId: user?.id || '' });
      if (sessionIds.length > 0) {
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error creating assistant sessions:', error);
      message.error('Failed to create assistant sessions. Please try again.');
    } finally {
      setIsCreatingSessions(false);
    }
  };

  const theme = useTheme();

  const selectedCount = selectedAssistants.length;
  const totalCount = filteredAssistants.length;

  if(activeTab === 'onboard') {
    return null;
  }
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={`${styles.logoText} ${theme.appearance === 'dark' ? '!text-black' : ``}`}>Klyno AI</span>
          </div>
          <div className={styles.headerActions}>
            <Button type="text" size="small" icon={<SettingOutlined />} />
            <Button type="text" size="small" icon={<CloseOutlined />} />
          </div>
        </div>
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (selectedInterests.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={`${styles.logoText} ${theme.appearance === 'dark' ? '!text-black' : ``}`}>Klyno AI</span>
          </div>
        </div>
        <div className={styles.mainContent}>
          <div className={styles.contentWrapper}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              className={styles.backButton}
              onClick={() => setActiveTab('onboard')}
            />
            <div className={styles.titleSection}>
              <h1 className={styles.mainTitle}>Please select your interests first</h1>
              <p className={styles.subtitle}>
                Go back to select your interests to get personalized assistant recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (filteredAssistants.length === 0 && !isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={`${styles.logoText} ${theme.appearance === 'dark' ? '!text-black' : ``}`}>Klyno AI</span>
          </div>
        </div>
        <div className={styles.mainContent}>
          <div className={styles.contentWrapper}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              className={styles.backButton}
              onClick={() => setActiveTab('onboard')}
            />
            <div className={styles.titleSection}>
              <h1 className={styles.mainTitle}>
                {retryCount > 0 ? 
                  `Searching for assistants... (Attempt ${retryCount}/${maxRetries})` : 
                  'No assistants found for your interests'
                }
              </h1>
              <p className={styles.subtitle}>
                {retryCount > 0 ? 
                  'Please wait while we search for more assistants matching your interests.' :
                  'We couldn\'t find any assistants matching your selected interests. Try going back to select different interests.'
                }
              </p>
            </div>
            {retryCount === 0 && (
              <div className={styles.actionButtons}>
                <Button
                  size="large"
                  type="text"
                  className={styles.skipButton}
                  onClick={() => {
                    router.push('/chat');
                    updateUserOnboarded({ userId: user?.id || '' });
                  }}
                >
                  Skip and continue
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={`${styles.logoText} ${theme.appearance === 'dark' ? '!text-black' : ``}`}>Klyno AI</span>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Back Button */}
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className={`${styles.backButton} ${theme.appearance === 'dark' ? '!text-black' : ``}`}
            onClick={() => {
              setActiveTab('onboard');
            }}
          />

          {/* Title Section */}
          <div className={styles.titleSection}>
            <h1 className={`${styles.mainTitle} ${theme.appearance === 'dark' ? '!text-black' : ``}`}>
              Based on your interests, I have selected the
              following smart assistants for you:
            </h1>
            <p className={`${styles.subtitle} ${theme.appearance === 'dark' ? '!text-black' : ``}`}>
              ({selectedCount}/{totalCount}) You can select and add your favorite assistants.
            </p>
          </div>

          {/* Assistants Grid */}
          <div className={styles.assistantsGrid}>
            {filteredAssistants.map((assistant) => (
              <div
                key={assistant.identifier}
                className={`${styles.card} ${
                  selectedAssistants.includes(assistant.identifier) ? styles.selectedCard : ''
                }`}
                onClick={() => toggleAssistant(assistant.identifier)}
              >
                {/* Selection Indicator */}
                {selectedAssistants.includes(assistant.identifier) ? (
                  <div className={styles.checkmark}>✓</div>
                ) : (
                  <div className={styles.plusIcon}>+</div>
                )}

                <div className={styles.cardContent}>
                  {/* Icon */}
                  <div className={styles.cardIcon}>
                    {assistant.avatar && assistant.avatar.startsWith('http') ? (
                      <img
                        src={assistant.avatar}
                        alt={assistant.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '8px',
                        }}
                        onError={(e) => {
                          // Hide the image and show emoji fallback
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.setAttribute(
                            'style',
                            'display: flex',
                          );
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        display:
                          assistant.avatar && assistant.avatar.startsWith('http') ? 'none' : 'flex',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      {getAssistantIcon(assistant)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className={styles.cardText}>
                    <h3 className={`${styles.cardTitle} ${theme.appearance === 'dark' ? '!text-black' : ``}`}>{assistant.title}</h3>
                    <p className={styles.cardDescription}>{assistant.description}</p>

                    {/* Tags */}
                    <div className={styles.tagsContainer}>
                      {getAssistantTags(assistant).map((tag, index) => (
                        <span key={index} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <Button
              size="large"
              className={styles.addButton}
              onClick={handleAddAssistant}
              loading={isCreatingSessions}
              disabled={isCreatingSessions || selectedAssistants.length === 0}
            >
              {isCreatingSessions ? 'Adding...' : `Add assistant and start`}
            </Button>
            <Button
              size="large"
              type="text"
              className={styles.skipButton}
              onClick={() => {
                router.push('/chat');
                updateUserOnboarded({ userId: user?.id || '' });
              }}
            >
              Skip
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span>© 2025 Klyno AI</span>
        <span
          onClick={() => {
            window.open(mailTo('support@ascensionhostings.com'), '_blank');
          }}
        >
          Email Support
        </span>
      </div>
    </div>
  );
};

export default OnBoardAssistant;