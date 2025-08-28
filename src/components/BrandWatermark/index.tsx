'use client';
import { createStyles } from 'antd-style';
import Link from 'next/link';
import { memo } from 'react';
import { Flexbox, FlexboxProps } from 'react-layout-kit';

import { ORG_NAME } from '@/const/branding';
import { isCustomORG } from '@/const/version';

const useStyles = createStyles(({ token, css }) => ({
  logoLink: css`
    line-height: 1;
    color: inherit;

    &:hover {
      color: ${token.colorLink};
    }
  `,
}));

const BrandWatermark = memo<Omit<FlexboxProps, 'children'>>(({ style, ...rest }) => {
  const { styles, theme } = useStyles();
  return (
    <Flexbox
      align={'center'}
      dir={'ltr'}
      flex={'none'}
      gap={4}
      horizontal
      style={{ color: theme.colorTextDescription, fontSize: 12, ...style }}
      {...rest}
    >
      <span>Powered by</span>
      {isCustomORG ? (
        <span>{ORG_NAME}</span>
      ) : (
        <Link
          className={styles.logoLink}
          href={process.env.NEXT_PUBLIC_APP_URL as string}
          target={'_blank'}
        >
          Klyno AI
        </Link>
      )}
    </Flexbox>
  );
});

export default BrandWatermark;
