'use client';

import { Tag } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { TrendingUp, X } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

const useStyles = createStyles(({ css, responsive, token }) => ({
  sidebar: css`
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    
    ${responsive.mobile} {
      max-width: 100%;
      margin-top: 24px;
    }
  `,
  widget: css`
    background: ${token.colorFillSecondary};
    border-radius: ${token.borderRadius}px;
    padding: 16px;
    border: 1px solid ${token.colorBorder};
  `,
  widgetHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  `,
  widgetTitle: css`
    font-size: 16px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  closeButton: css`
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    
    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  topicButton: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    margin: 4px;
    border-radius: 20px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorder};
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: ${token.colorPrimaryBg};
      border-color: ${token.colorPrimary};
    }
  `,
  saveButton: css`
    width: 100%;
    margin-top: 12px;
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: ${token.colorPrimaryHover};
    }
  `,
  weatherInfo: css`
    text-align: center;
    margin-bottom: 12px;
  `,
  temperature: css`
    font-size: 24px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  location: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    margin-top: 4px;
  `,
  forecast: css`
    display: flex;
    justify-content: space-between;
    gap: 8px;
  `,
  forecastDay: css`
    text-align: center;
    flex: 1;
  `,
  forecastTemp: css`
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorText};
  `,
  forecastDayName: css`
    font-size: 10px;
    color: ${token.colorTextSecondary};
    margin-bottom: 4px;
  `,
  marketItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid ${token.colorBorder};
    
    &:last-child {
      border-bottom: none;
    }
  `,
  marketName: css`
    font-size: 12px;
    color: ${token.colorText};
    font-weight: 500;
  `,
  marketChange: css`
    font-size: 12px;
    font-weight: 500;
  `,
  marketChangePositive: css`
    color: #10b981;
  `,
  marketChangeNegative: css`
    color: #ef4444;
  `,
  marketValue: css`
    font-size: 11px;
    color: ${token.colorTextSecondary};
  `,
  companyItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid ${token.colorBorder};
    
    &:last-child {
      border-bottom: none;
    }
  `,
  companyLogo: css`
    width: 24px;
    height: 24px;
    border-radius: 4px;
  `,
  companyInfo: css`
    flex: 1;
  `,
  companyName: css`
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorText};
  `,
  companyTicker: css`
    font-size: 10px;
    color: ${token.colorTextSecondary};
  `,
  companyPrice: css`
    text-align: right;
  `,
  companyPriceValue: css`
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorText};
  `,
  companyPriceChange: css`
    font-size: 10px;
    font-weight: 500;
  `,
}));

const NewsSidebar = memo(() => {
  const { styles } = useStyles();

  const topics = [
    { name: 'Tech & Science', icon: '🔬' },
    { name: 'Finance', icon: '💰' },
    { name: 'Arts & Culture', icon: '🎨' },
    { name: 'Sports', icon: '⚽' },
    { name: 'Entertainment', icon: '🎬' },
  ];

  const marketData = [
    { name: 'S&P Futures', change: '+2.5', changePercent: '0.04%', value: '6,696', positive: true },
    { name: 'NASDAQ Futures', change: '+15', changePercent: '0.06%', value: '24,720.5', positive: true },
    { name: 'Bitcoin', change: '-US$61', changePercent: '0.59%', value: 'US$116,425', positive: false },
    { name: 'VIX', change: '-0.12', changePercent: '0.76%', value: '15.58', positive: false },
  ];

  const trendingCompanies = [
    { name: 'Intel Corporation', ticker: 'INTC', price: 'US$30.57', change: '+22.77%', positive: true, logo: 'https://logo.clearbit.com/intel.com' },
    { name: 'Nvidia', ticker: 'NVDA', price: 'US$1,234.56', change: '+15.23%', positive: true, logo: 'https://logo.clearbit.com/nvidia.com' },
    { name: 'Meta', ticker: 'META', price: 'US$567.89', change: '-5.67%', positive: false, logo: 'https://logo.clearbit.com/meta.com' },
    { name: 'Google', ticker: 'GOOGL', price: 'US$2,345.67', change: '+8.91%', positive: true, logo: 'https://logo.clearbit.com/google.com' },
    { name: 'PayPal', ticker: 'PYPL', price: 'US$78.90', change: '-12.34%', positive: false, logo: 'https://logo.clearbit.com/paypal.com' },
  ];

  return (
    <div className={styles.sidebar}>
      {/* Make it yours widget */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <h3 className={styles.widgetTitle}>Make it yours</h3>
          <X className={styles.closeButton} size={16} />
        </div>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          Select topics and interests to customize your Discover experience
        </p>
        <div>
          {topics.map((topic) => (
            <button key={topic.name} className={styles.topicButton}>
              <span>{topic.icon}</span>
              <span>{topic.name}</span>
            </button>
          ))}
        </div>
        <button className={styles.saveButton}>Save Interests</button>
      </div>

      {/* Weather widget */}
      <div className={styles.widget}>
        <div className={styles.weatherInfo}>
          <div className={styles.temperature}>72°F</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Partly cloudy</div>
          <div className={styles.location}>Your Location</div>
          <div style={{ fontSize: '10px', color: '#999' }}>H: 75° L: 68°</div>
        </div>
        <div className={styles.forecast}>
          {['Fri', 'Sat', 'Sun', 'Mon', 'Tue'].map((day, index) => (
            <div key={day} className={styles.forecastDay}>
              <div className={styles.forecastDayName}>{day}</div>
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>☀️</div>
              <div className={styles.forecastTemp}>72°</div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Outlook widget */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <h3 className={styles.widgetTitle}>Market Outlook</h3>
          <TrendingUp size={16} color="#666" />
        </div>
        {marketData.map((item) => (
          <div key={item.name} className={styles.marketItem}>
            <div>
              <div className={styles.marketName}>{item.name}</div>
              <div className={styles.marketValue}>{item.value}</div>
            </div>
            <div className={styles.companyPrice}>
              <div className={`${styles.marketChange} ${item.positive ? styles.marketChangePositive : styles.marketChangeNegative}`}>
                {item.changePercent} {item.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trending Companies widget */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <h3 className={styles.widgetTitle}>Trending Companies</h3>
        </div>
        {trendingCompanies.map((company) => (
          <div key={company.ticker} className={styles.companyItem}>
            <Image
              src={company.logo}
              alt={company.name}
              width={24}
              height={24}
              className={styles.companyLogo}
              unoptimized
            />
            <div className={styles.companyInfo}>
              <div className={styles.companyName}>{company.name}</div>
              <div className={styles.companyTicker}>{company.ticker}</div>
            </div>
            <div className={styles.companyPrice}>
              <div className={styles.companyPriceValue}>{company.price}</div>
              <div className={`${styles.companyPriceChange} ${company.positive ? styles.marketChangePositive : styles.marketChangeNegative}`}>
                {company.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default NewsSidebar;
