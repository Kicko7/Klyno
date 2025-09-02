'use client';

import { FluentEmoji } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { BRANDING_NAME } from '@/const/branding';

const useStyles = createStyles(({ css, responsive, token }) => ({
  container: css`
    align-items: center;
    ${responsive.mobile} {
      align-items: flex-start;
    }
  `,
  desc: css`
    font-size: 16px;
    text-align: center;
    color: ${token.colorTextSecondary};
    margin-top: 8px;
    line-height: 1.5;
    ${responsive.mobile} {
      text-align: start;
      font-size: 14px;
    }
  `,
  title: css`
    margin-block: 0.2em 0;
    font-size: 36px;
    font-weight: 700;
    line-height: 1.2;
    color: ${token.colorText};
    ${responsive.mobile} {
      font-size: 28px;
    }
  `,
  welcomeCard: css`
    background: ${token.colorBgContainer};
    border-radius: 16px;
    padding: 32px;
    box-shadow: ${token.boxShadow};
    border: 1px solid ${token.colorBorder};
  `,
  features: css`
    margin-top: 24px;
    padding: 16px;
    background: ${token.colorBgLayout};
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
  `,
  featureItem: css`
    color: ${token.colorTextSecondary};
    font-size: 14px;
    margin-bottom: 8px;
    &:last-child {
      margin-bottom: 0;
    }
  `,
}));

interface KlynoWelcomeProps {
  showTeamFeatures?: boolean;
  organizationName?: string;
}

const KlynoWelcome = memo<KlynoWelcomeProps>(({ showTeamFeatures = false, organizationName }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('welcome');

  return (
    <Center padding={24} width={'100%'}>
      <Flexbox className={styles.container} gap={20} style={{ maxWidth: 600 }} width={'100%'}>
        <div className={styles.welcomeCard}>
          <Flexbox align={'center'} gap={12} horizontal>
            <FluentEmoji emoji={'🤖'} size={48} type={'anim'} />
            <h1 className={styles.title}>
              {t('title', { appName: BRANDING_NAME, defaultValue: `Welcome to ${BRANDING_NAME}` })}
            </h1>
          </Flexbox>
          
          <div className={styles.desc}>
            {showTeamFeatures && organizationName ? (
              <>
                Welcome to <strong>{organizationName}</strong>!
                <br />
                Your team AI assistant is ready to help with collaborative tasks and questions.
                <br />
                Start a conversation by adding a new chat.
              </>
            ) : (
              <>
                {t('subtitle', { 
                  defaultValue: 'Your intelligent AI assistant is ready to help you with any questions or tasks.' 
                })}
                <br />
                Start a conversation by adding a new chat.
              </>
            )}
          </div>

          {showTeamFeatures && (
            <div className={styles.features}>
              <strong>Team Features:</strong>
              <div className={styles.featureItem}>• Collaborative AI conversations</div>
              <div className={styles.featureItem}>• Team knowledge sharing</div>
              <div className={styles.featureItem}>• Multi-user chat support</div>
              <div className={styles.featureItem}>• Organization-wide AI assistance</div>
            </div>
          )}
        </div>
      </Flexbox>
    </Center>
  );
});

KlynoWelcome.displayName = 'KlynoWelcome';

export default KlynoWelcome;
