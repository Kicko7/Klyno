'use client';

import { createStyles } from 'antd-style';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { BRANDING_NAME } from '@/const/branding';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    height: 100%;
    background: ${token.colorBgLayout};
    padding: 24px;
  `,
  title: css`
    font-size: 32px;
    font-weight: 600;
    color: ${token.colorText};
    margin-bottom: 8px;
  `,
  subtitle: css`
    font-size: 16px;
    color: ${token.colorTextSecondary};
    margin-bottom: 32px;
  `,
  card: css`
    background: ${token.colorBgContainer};
    border-radius: 16px;
    padding: 32px;
    max-width: 600px;
    width: 100%;
    box-shadow: ${token.boxShadow};
  `,
}));

const WelcomeScreen = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('welcome');

  return (
    <div className={styles.container}>
      <Center height="100%">
        <div className={styles.card}>
          <Flexbox align="center" gap={16}>
            <div className={styles.title}>
              {t('title', { appName: BRANDING_NAME, defaultValue: `Welcome to ${BRANDING_NAME}` })}
            </div>
            <div className={styles.subtitle}>
              {t('subtitle', { 
                defaultValue: 'Your AI assistant is ready to help. Start a conversation below.' 
              })}
            </div>
          </Flexbox>
        </div>
      </Center>
    </div>
  );
});

WelcomeScreen.displayName = 'WelcomeScreen';

export default WelcomeScreen;
