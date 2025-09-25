'use client';

import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import NewsCard, { NewsItem } from './NewsCard';

const useStyles = createStyles(({ css, responsive, token }) => ({
  container: css`
    width: 100%;
  `,
  grid: css`
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    
    ${responsive.mobile} {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    
    @media (min-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    @media (min-width: 1200px) {
      grid-template-columns: repeat(3, 1fr);
    }
  `,
  featuredGrid: css`
    display: grid;
    gap: 16px;
    grid-template-columns: 2fr 1fr 1fr;
    
    ${responsive.mobile} {
      grid-template-columns: 1fr;
    }
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  `,
  featuredCard: css`
    &:first-child {
      grid-row: span 2;
    }
  `,
}));

interface NewsListProps {
  data: NewsItem[];
  featured?: boolean;
  onItemClick?: (item: NewsItem) => void;
}

const NewsList = memo<NewsListProps>(({ data, featured = false, onItemClick }) => {
  const { styles } = useStyles();

  if (featured) {
    return (
      <div className={styles.container}>
        <div className={styles.featuredGrid}>
          {data.slice(0, 3).map((item, index) => (
            <div key={item.id} className={index === 0 ? styles.featuredCard : ''}>
              <NewsCard item={item} onClick={onItemClick} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {data.map((item) => (
          <NewsCard key={item.id} item={item} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
});

export default NewsList;
