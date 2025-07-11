import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeAppearance } from 'antd-style';
import { ResolvingViewport } from 'next';
import { ReactNode } from 'react';
import { isRtlLang } from 'rtl-detect';

import Analytics from '@/components/Analytics';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DEFAULT_LANG } from '@/const/locale';
import { isDesktop } from '@/const/version';
import PWAInstall from '@/features/PWAInstall';
import AuthProvider from '@/layout/AuthProvider';
import GlobalProvider from '@/layout/GlobalProvider';
import { Locales } from '@/locales/resources';
import { DynamicLayoutProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

const inVercel = process.env.VERCEL === '1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// RootLayoutProps extends DynamicLayoutProps to ensure type compatibility with Next.js
interface RootLayoutProps extends DynamicLayoutProps {
  children: ReactNode;
}

const RootLayout = async ({ children, params, modal }: RootLayoutProps) => {
  const { variants } = await params;

  const { locale, isMobile, theme, primaryColor, neutralColor } =
    RouteVariants.deserializeVariants(variants);

  const direction = isRtlLang(locale) ? 'rtl' : 'ltr';

  return (
    <html dir={direction} lang={locale} suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          <GlobalProvider
            appearance={theme}
            isMobile={isMobile}
            locale={locale}
            neutralColor={neutralColor}
            primaryColor={primaryColor}
          >
            <AuthProvider>
              {children}
              {!isMobile && modal}
            </AuthProvider>
            <PWAInstall />
          </GlobalProvider>
          <Analytics />
          {inVercel && <SpeedInsights />}
        </ErrorBoundary>
      </body>
    </html>
  );
};

export default RootLayout;

export { generateMetadata } from './metadata';

export const generateViewport = async (props: DynamicLayoutProps): ResolvingViewport => {
  const isMobile = await RouteVariants.getIsMobile(props);

  const dynamicScale = isMobile ? { maximumScale: 1, userScalable: false } : {};

  return {
    ...dynamicScale,
    initialScale: 1,
    minimumScale: 1,
    themeColor: [
      { color: '#ffffff', media: '(prefers-color-scheme: light)' },
      { color: '#000000', media: '(prefers-color-scheme: dark)' },
    ],
    viewportFit: 'cover',
    width: 'device-width',
  };
};

export const generateStaticParams = () => {
  // if in dev mode or in vercel preview mode, use ISR to speed up
  const isVercelPreview = process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'production';

  if (process.env.NODE_ENV !== 'production' || isVercelPreview) {
    return [];
  }

  const themes: ThemeAppearance[] = ['dark', 'light'];
  const mobileOptions = isDesktop ? [false] : [true, false];
  // only static for several page, other go to dynamic
  const staticLocales: Locales[] = [DEFAULT_LANG, 'zh-CN'];

  const variants: { variants: string }[] = [];

  for (const locale of staticLocales) {
    for (const theme of themes) {
      for (const isMobile of mobileOptions) {
        variants.push({
          variants: RouteVariants.serializeVariants({ isMobile, locale, theme }),
        });
      }
    }
  }

  return variants;
};
