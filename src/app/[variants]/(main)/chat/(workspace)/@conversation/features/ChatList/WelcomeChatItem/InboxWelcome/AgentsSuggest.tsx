'use client';

import { ActionIcon, Avatar, Block, Grid, Text, Tag } from '@lobehub/ui';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { RefreshCw, TrendingUp, BookOpen, Search, Briefcase, Palette } from 'lucide-react';
import Link from 'next/link';
import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import urlJoin from 'url-join';

import { useDiscoverStore } from '@/store/discover';
import { DiscoverAssistantItem, AssistantCategory } from '@/types/discover';

const useStyles = createStyles(({ css, token, responsive }) => ({
  card: css`
    position: relative;

    overflow: hidden;

    height: 100%;
    min-height: 110px;
    padding: 16px;
    border-radius: ${token.borderRadiusLG}px;

    background: ${token.colorBgContainer};

    ${responsive.mobile} {
      min-height: 72px;
    }
  `,
  cardDesc: css`
    margin-block: 0 !important;
    color: ${token.colorTextDescription};
  `,
  cardTitle: css`
    margin-block: 0 !important;
    font-size: 16px;
    font-weight: bold;
  `,
  icon: css`
    color: ${token.colorTextSecondary};
  `,
  title: css`
    color: ${token.colorTextDescription};
  `,
}));

const AgentsSuggest = memo<{ mobile?: boolean }>(({ mobile }) => {
  const { t } = useTranslation('welcome');
  const [refreshKey, setRefreshKey] = useState(0);
  const useAssistantList = useDiscoverStore((s) => s.useAssistantList);

  // Define recommended categories with their icons and display names
  const recommendedCategories = useMemo(() => [
    { category: AssistantCategory.Marketing, icon: TrendingUp, label: 'Marketing', color: '#ff6b6b' },
    { category: AssistantCategory.Education, icon: BookOpen, label: 'Reading & Learning', color: '#4ecdc4' },
    { category: AssistantCategory.CopyWriting, icon: Search, label: 'SEO & Content', color: '#45b7d1' },
    { category: AssistantCategory.Career, icon: Briefcase, label: 'Career & Business', color: '#96ceb4' },
    { category: AssistantCategory.Design, icon: Palette, label: 'Design & Creative', color: '#feca57' },
  ], []);

  // Fetch assistants from each category
  const categoryQueries = recommendedCategories.map(({ category }) => 
    useAssistantList({
      category,
      page: 1,
      pageSize: 1, // Get 1 assistant per category
    })
  );

  const isLoading = categoryQueries.some(query => query.isLoading);
  const hasError = categoryQueries.some(query => query.error);
  const allData = categoryQueries
    .map(query => query.data?.items?.[0])
    .filter((item): item is DiscoverAssistantItem => Boolean(item));

  const { styles } = useStyles();

  const loadingCards = Array.from({ length: mobile ? 2 : 4 }).map((_, index) => (
    <Block className={styles.card} key={index}>
      <Skeleton active avatar paragraph={{ rows: 2 }} title={false} />
    </Block>
  ));

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // if no assistant data, just hide the component
  if (!isLoading && !allData.length) return null;

  return (
    <Flexbox gap={8} width={'100%'}>
      <Flexbox align={'center'} horizontal justify={'space-between'}>
        <div className={styles.title}>{t('guide.agents.title')}</div>
        <ActionIcon
          icon={RefreshCw}
          onClick={handleRefresh}
          size={{ blockSize: 24, size: 14 }}
          title={t('guide.agents.replaceBtn')}
        />
      </Flexbox>
      <Grid gap={8} rows={2}>
        {isLoading
          ? loadingCards
          : allData.map((item, index) => {
              const categoryInfo = recommendedCategories[index];
              const IconComponent = categoryInfo?.icon || TrendingUp;
              
              return (
                <Link
                  href={urlJoin('/discover/assistant', item.identifier)}
                  key={item.identifier}
                  prefetch={false}
                >
                  <Block className={styles.card} clickable gap={12} horizontal variant={'outlined'}>
                    <Avatar avatar={item.avatar} style={{ flex: 'none' }} />
                    <Flexbox gap={4} style={{ overflow: 'hidden', width: '100%' }}>
                      <Flexbox align={'center'} gap={8} horizontal>
                        <Text className={styles.cardTitle} ellipsis={{ rows: 1 }}>
                          {item.title}
                        </Text>
                        {categoryInfo && (
                          <Tag
                            color={categoryInfo.color}
                            icon={<IconComponent size={12} />}
                            style={{ fontSize: '11px', padding: '2px 6px' }}
                          >
                            {categoryInfo.label}
                          </Tag>
                        )}
                      </Flexbox>
                      <Text className={styles.cardDesc} ellipsis={{ rows: mobile ? 1 : 2 }}>
                        {item.description}
                      </Text>
                    </Flexbox>
                  </Block>
                </Link>
              );
            })}
      </Grid>
    </Flexbox>
  );
});

export default AgentsSuggest;
