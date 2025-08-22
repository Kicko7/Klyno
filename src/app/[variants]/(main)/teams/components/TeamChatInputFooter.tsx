import { Button } from '@lobehub/ui';
import { Space } from 'antd';
import { createStyles } from 'antd-style';
import { rgba } from 'polished';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

const useStyles = createStyles(({ css, prefixCls, token }) => {
  return {
    arrow: css`
      &.${prefixCls}-btn.${prefixCls}-btn-icon-only {
        width: 28px;
      }
    `,
    loadingButton: css`
      display: flex;
      align-items: center;
    `,
    overrideAntdIcon: css`
      .${prefixCls}-btn.${prefixCls}-btn-icon-only {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .${prefixCls}-btn.${prefixCls}-btn-dropdown-trigger {
        &::before {
          background-color: ${rgba(token.colorBgLayout, 0.1)} !important;
        }
      }
    `,
  };
});

interface FooterProps {
  isLoading: boolean;
  inputMessage: string;
  handleSend: () => void;
}

const TeamChatInputFooter = memo<FooterProps>(({ isLoading, inputMessage, handleSend }) => {
  const { t } = useTranslation('chat');
  const { styles } = useStyles();

  return (
    <>
      <Flexbox
        align={'end'}
        className={styles.overrideAntdIcon}
        distribution={'space-between'}
        flex={'none'}
        gap={8}
        horizontal
        paddingInline={16}
      >
        <Flexbox align={'center'} gap={8} horizontal style={{ overflow: 'hidden' }}></Flexbox>
        <Flexbox align={'center'} flex={'none'} gap={8} horizontal>
          <Flexbox style={{ minWidth: 92 }}>
            <Space.Compact>
              <Button
                disabled={isLoading || !inputMessage.trim()}
                type={'primary'}
                onClick={handleSend}
              >
                {t('input.send')}
              </Button>
            </Space.Compact>
          </Flexbox>
        </Flexbox>
      </Flexbox>
    </>
  );
});

TeamChatInputFooter.displayName = 'TeamChatInputFooter';

export default TeamChatInputFooter;
