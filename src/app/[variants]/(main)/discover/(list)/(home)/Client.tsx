'use client';

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import Title from '../../components/Title';
import NewsList from '../../components/NewsList';
import NewsSidebar from '../../components/NewsSidebar';
import { featuredNews, regularNews } from '../../data/newsData';

const Client = memo<{ mobile?: boolean }>(({ mobile = false }) => {
  const { t } = useTranslation('discover');

  const handleNewsClick = (item: any) => {
    // Handle news item click - could open in new tab or navigate to detail page
    console.log('News clicked:', item);
  };

  return (
    <Flexbox horizontal={!mobile} gap={24} width="100%">
      <Flexbox flex={1} gap={24}>
        {/* Featured News Section */}
        <div>
          <Title more="View All" moreLink="/discover/news">
            Featured Stories
          </Title>
          <NewsList data={featuredNews} featured={true} onItemClick={handleNewsClick} />
        </div>

        {/* Regular News Section */}
        <div>
          <Title more="View All" moreLink="/discover/news">
            Latest News
          </Title>
          <NewsList data={regularNews} onItemClick={handleNewsClick} />
        </div>
      </Flexbox>

      {/* Sidebar - only show on desktop */}
      {!mobile && (
        <div style={{ width: '320px', flexShrink: 0 }}>
          <NewsSidebar />
        </div>
      )}
    </Flexbox>
  );
});

export default Client;
