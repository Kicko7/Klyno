'use client';

import { Tag } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Heart, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

const useStyles = createStyles(({ css, responsive, token }) => ({
  card: css`
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;
    overflow: hidden;
    background: ${token.colorBgContainer};
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${token.boxShadowSecondary};
      border-color: ${token.colorPrimary};
    }
  `,
  image: css`
    width: 100%;
    height: 200px;
    object-fit: cover;
    background: ${token.colorFillSecondary};
  `,
  content: css`
    padding: 16px;
  `,
  title: css`
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    color: ${token.colorText};
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  summary: css`
    font-size: 14px;
    color: ${token.colorTextSecondary};
    line-height: 1.5;
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  meta: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: ${token.colorTextTertiary};
  `,
  source: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  actionIcon: css`
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    
    &:hover {
      background: ${token.colorFillSecondary};
    }
  `,
  tag: css`
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    margin-right: 4px;
  `,
}));

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  image: string;
  publishedAt: string;
  source: string;
  sourceIcon?: string;
  category: string;
  readTime?: string;
}

interface NewsCardProps {
  item: NewsItem;
  onClick?: (item: NewsItem) => void;
}

const NewsCard = memo<NewsCardProps>(({ item, onClick }) => {
  const { styles } = useStyles();

  const handleClick = () => {
    onClick?.(item);
  };

  const formatTimeAgo = (publishedAt: string) => {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffInHours = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return published.toLocaleDateString();
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      <Image
        src={item.image}
        alt={item.title}
        width={400}
        height={200}
        className={styles.image}
        unoptimized
      />
      <div className={styles.content}>
        <div className={styles.source}>
          <span className={styles.tag}>{item.category}</span>
          <span>{formatTimeAgo(item.publishedAt)}</span>
        </div>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.summary}>{item.summary}</p>
        <div className={styles.meta}>
          <div className={styles.source}>
            {item.sourceIcon && (
              <Image
                src={item.sourceIcon}
                alt={item.source}
                width={16}
                height={16}
                style={{ borderRadius: '50%' }}
                unoptimized
              />
            )}
            <span>{item.source}</span>
            {item.readTime && <span>• {item.readTime}</span>}
          </div>
          <div className={styles.actions}>
            <Heart className={styles.actionIcon} size={16} />
            <MoreHorizontal className={styles.actionIcon} size={16} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default NewsCard;
