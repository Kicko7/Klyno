// 定义主题类型
import { ThemeAppearance } from 'antd-style/lib/types/appearance';

import { DEFAULT_LANG } from '@/const/locale';
import { Locales, locales } from '@/locales/resources';
import { DynamicLayoutProps, DynamicPageProps } from '@/types/next';

// 定义变体接口
export interface IRouteVariants {
  isMobile: boolean;
  locale: Locales;
  neutralColor?: string;
  primaryColor?: string;
  theme: ThemeAppearance;
}

// Union type for props that have params (both layout and page props)
type PropsWithParams = DynamicLayoutProps | DynamicPageProps;

// 支持的主题
const SUPPORTED_THEMES = ['dark', 'light'] as const;

// 默认变体配置
export const DEFAULT_VARIANTS: IRouteVariants = {
  isMobile: false,
  locale: DEFAULT_LANG,
  theme: 'light',
};

const SPLITTER = '__';

export class RouteVariants {
  static serializeVariants = (variants: IRouteVariants): string => {
    // 使用紧凑的格式: locale_isMobile_theme
    // 例如: "en-US_0_dark" 表示 英文_非移动端_深色主题
    return [variants.locale, Number(variants.isMobile), variants.theme].join(SPLITTER);
  };

  static deserializeVariants = (serialized: string): IRouteVariants => {
    try {
      const [locale, isMobile, theme] = serialized.split(SPLITTER);

      // 验证并返回变体
      return {
        isMobile: isMobile === '1',
        locale: this.isValidLocale(locale) ? (locale as Locales) : DEFAULT_VARIANTS.locale,
        theme: this.isValidTheme(theme) ? theme : DEFAULT_VARIANTS.theme,
      };
    } catch {
      // 解析失败时返回默认值
      return { ...DEFAULT_VARIANTS };
    }
  };

  // Updated to accept both layout and page props
  static getVariantsFromProps = async (props: PropsWithParams) => {
    const { variants } = await props.params;
    return RouteVariants.deserializeVariants(variants);
  };

  // Updated to accept both layout and page props
  static getIsMobile = async (props: PropsWithParams) => {
    const { variants } = await props.params;
    const { isMobile } = RouteVariants.deserializeVariants(variants);
    return isMobile;
  };

  // Updated to accept both layout and page props
  static getLocale = async (props: PropsWithParams) => {
    const { variants } = await props.params;
    const { locale } = RouteVariants.deserializeVariants(variants);
    return locale;
  };

  // 工具函数：创建变体

  static createVariants = (options: Partial<IRouteVariants> = {}): IRouteVariants => ({
    ...DEFAULT_VARIANTS,
    ...options,
  });

  // 验证函数
  private static isValidLocale = (locale: unknown): boolean =>
    (locales as readonly string[]).includes(locale as string);

  private static isValidTheme = (theme: unknown): boolean =>
    (SUPPORTED_THEMES as readonly string[]).includes(theme as string);
}
