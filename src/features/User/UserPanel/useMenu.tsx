import { Hotkey, Icon } from '@lobehub/ui';
import { DiscordIcon } from '@lobehub/ui/icons';
import { ItemType } from 'antd/es/menu/interface';
import {
  Book,
  CircleUserRound,
  Cloudy,
  Download,
  Feather,
  HardDriveDownload,
  LifeBuoy,
  LogOut,
  Mail,
  Settings2,
  CreditCard,
  Share2,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import type { MenuProps } from '@/components/Menu';
import { enableAuth } from '@/const/auth';
import { BRANDING_EMAIL, LOBE_CHAT_CLOUD, SOCIAL_URL } from '@/const/branding';
import { DEFAULT_HOTKEY_CONFIG } from '@/const/settings';
import {
  DOCUMENTS_REFER_URL,
  GITHUB_ISSUES,
  OFFICIAL_URL,
  UTM_SOURCE,
  mailTo,
} from '@/const/url';
import { isDesktop } from '@/const/version';
import DataImporter from '@/features/DataImporter';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

export const useMenu = () => {
  const { canInstall, install } = usePWAInstall();
  const { t } = useTranslation(['common', 'setting', 'auth']);
  const { showCloudPromotion, hideDocs } = useServerConfigStore(featureFlagsSelectors);
  const [isLogin, isLoginWithAuth] = useUserStore((s) => [
    authSelectors.isLogin(s),
    authSelectors.isLoginWithAuth(s),
  ]);

  const profile: MenuProps['items'] = [
    {
      icon: <Icon icon={CircleUserRound} />,
      key: 'profile',
      label: <Link href={'/profile'}>{t('userPanel.profile')}</Link>,
    },
  ];

  const settings: MenuProps['items'] = [
    {
      extra: isDesktop ? (
        <div>
          <Hotkey keys={DEFAULT_HOTKEY_CONFIG.openSettings} />
        </div>
      ) : undefined,
      icon: <Icon icon={Settings2} />,
      key: 'setting',
      label: (
        <Link href={'/settings/common'}>
          {t('userPanel.setting')}
        </Link>
      ),
    },
    {
      icon: <Icon icon={CreditCard} />,
      key: 'plans',
      label: (
        <Link href={'/pricing'}>
          Plans & Pricing
        </Link>
      ),
    },
    {
      icon: <Icon icon={Share2} />,
      key: 'affiliate',
      label: (
        <Link href={'/affiliate'}>
          Affiliate
        </Link>
      ),
    },
    {
      type: 'divider',
    },
  ];

  /* ↓ cloud slot ↓ */

  /* ↑ cloud slot ↑ */

  const pwa: MenuProps['items'] = [
    {
      icon: <Icon icon={Download} />,
      key: 'pwa',
      label: t('installPWA'),
      onClick: () => install(),
    },
    {
      type: 'divider',
    },
  ];

  const data = !isLogin
    ? []
    : ([
        {
          icon: <Icon icon={HardDriveDownload} />,
          key: 'import',
          label: <DataImporter>{t('importData')}</DataImporter>,
        },
        {
          type: 'divider',
        },
      ].filter(Boolean) as ItemType[]);

  const helps: MenuProps['items'] = [
    showCloudPromotion && {
      icon: <Icon icon={Cloudy} />,
      key: 'cloud',
      label: (
        <Link href={`${OFFICIAL_URL}?utm_source=${UTM_SOURCE}`} target={'_blank'}>
          {t('userPanel.cloud', { name: LOBE_CHAT_CLOUD })}
        </Link>
      ),
    },
    {
      children: [
        // {
        //   icon: <Icon icon={Book} />,
        //   key: 'docs',
        //   label: (
        //     <Link href={DOCUMENTS_REFER_URL} target={'_blank'}>
        //       {t('userPanel.docs')}
        //     </Link>
        //   ),
        // },
        {
          icon: <Icon icon={Feather} />,
          key: 'feedback',
          label: (
            <Link href={'https://agent.jotform.com/0199041db2217e5e8697c6247e9763169b25'} target={'_blank'}>
              {t('userPanel.feedback')}
            </Link>
          ),
        },
        // {
        //   icon: <Icon icon={DiscordIcon} />,
        //   key: 'discord',
        //   label: (
        //     <Link href={SOCIAL_URL.discord} target={'_blank'}>
        //       {t('userPanel.discord')}
        //     </Link>
        //   ),
        // },
        {
          icon: <Icon icon={Mail} />,
          key: 'email',
          label: (
            <Link href={mailTo("support@ascensionhostings.com")} target={'_blank'}>
              {t('userPanel.email')}
            </Link>
          ),
        },
      ],
      icon: <Icon icon={LifeBuoy} />,
      key: 'help',
      label: t('userPanel.help'),
    },
    {
      type: 'divider',
    },
  ].filter(Boolean) as ItemType[];

  const mainItems = [
    {
      type: 'divider',
    },
    ...(!enableAuth || (enableAuth && isLoginWithAuth) ? profile : []),
    ...(isLogin ? settings : []),
    /* ↓ cloud slot ↓ */

    /* ↑ cloud slot ↑ */
    ...(canInstall ? pwa : []),
    ...data,
    ...(!hideDocs ? helps : []),
  ].filter(Boolean) as MenuProps['items'];

  const logoutItems: MenuProps['items'] = isLoginWithAuth
    ? [
        {
          icon: <Icon icon={LogOut} />,
          key: 'logout',
          label: <span>{t('signout', { ns: 'auth' })}</span>,
        },
      ]
    : [];

  return { logoutItems, mainItems };
};
