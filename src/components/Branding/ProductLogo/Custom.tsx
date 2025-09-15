import type { IconType } from '@lobehub/icons';
import type { LobeChatProps } from '@lobehub/ui/brand';
import { createStyles, useTheme } from 'antd-style';
import Image, { ImageProps } from 'next/image';
import { usePathname } from 'next/navigation';
import { ReactNode, forwardRef, memo } from 'react';
import { Flexbox, FlexboxProps } from 'react-layout-kit';

import { BRANDING_LOGO_URL, BRANDING_NAME } from '@/const/branding';

const useStyles = createStyles(({ css }) => {
  return {
    extraTitle: css`
      font-weight: 300;
      white-space: nowrap;
    `,
  };
});

const CustomTextLogo = memo<FlexboxProps & { size: number }>(({ size, style, ...rest }) => {
  const theme = useTheme();

  return (
    <Flexbox
      height={size}
      className={`
      flex items-center justify-center 
      font-extrabold 
      bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 
      bg-clip-text text-transparent
    `}
      style={{
        fontSize: size / 1.2,
        userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {BRANDING_NAME}
    </Flexbox>
  );
});

const CustomImageLogo = memo<Omit<ImageProps, 'alt' | 'src'> & { size: number }>(
  ({ size, ...rest }) => {
    // Don't render image if BRANDING_LOGO_URL is empty

    if (!BRANDING_LOGO_URL) {
      return <CustomTextLogo size={size} {...rest} />;
    }

    return (
      <Image
        alt={BRANDING_NAME}
        height={size}
        src={BRANDING_LOGO_URL}
        unoptimized={true}
        width={size}
        {...rest}
      />
    );
  },
);

const Divider: IconType = forwardRef(({ size = '1em', style, ...rest }, ref) => (
  <svg
    fill="none"
    height={size}
    ref={ref}
    shapeRendering="geometricPrecision"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flex: 'none', lineHeight: 1, ...style }}
    viewBox="0 0 24 24"
    width={size}
    {...rest}
  >
    <path d="M16.88 3.549L7.12 20.451" />
  </svg>
));

const CustomLogo = memo<LobeChatProps>(({ extra, size = 32, className, style, type, ...rest }) => {
  const theme = useTheme();
  const { styles } = useStyles();
  let logoComponent: ReactNode;

  switch (type) {
    case '3d':
    case 'flat': {
      logoComponent = BRANDING_LOGO_URL ? (
        <CustomImageLogo size={size} style={style} {...rest} />
      ) : (
        <CustomTextLogo size={size} style={style} {...rest} />
      );
      break;
    }
    case 'mono': {
      logoComponent = BRANDING_LOGO_URL ? (
        <CustomImageLogo size={size} style={{ filter: 'grayscale(100%)', ...style }} {...rest} />
      ) : (
        <CustomTextLogo size={size} style={style} {...rest} />
      );
      break;
    }
    case 'text': {
      logoComponent = <CustomTextLogo size={size} style={style} {...rest} />;
      break;
    }
    case 'combine': {
      logoComponent = (
        <>
          {BRANDING_LOGO_URL && <CustomImageLogo size={size} />}
          {/* <CustomTextLogo size={size} style={{ marginLeft: BRANDING_LOGO_URL ? Math.round(size / 4) : 0 }} /> */}
        </>
      );

      if (!extra)
        logoComponent = (
          <Flexbox align={'center'} flex={'none'} horizontal {...rest}>
            {logoComponent}
          </Flexbox>
        );

      break;
    }
    default: {
      logoComponent = BRANDING_LOGO_URL ? (
        <CustomImageLogo size={size} style={style} {...rest} />
      ) : (
        <CustomTextLogo size={size} style={style} {...rest} />
      );
      break;
    }
  }

  if (!extra) return logoComponent;

  const extraSize = Math.round((size / 3) * 1.9);

  return (
    <Flexbox align={'center'} className={className} flex={'none'} horizontal {...rest}>
      {logoComponent}
      <Divider size={extraSize} style={{ color: theme.colorFill }} />
      <div className={styles.extraTitle} style={{ fontSize: extraSize }}>
        {extra}
      </div>
    </Flexbox>
  );
});

export default CustomLogo;
