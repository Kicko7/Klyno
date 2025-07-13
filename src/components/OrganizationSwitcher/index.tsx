'use client';

import { OrganizationSwitcher as ClerkOrganizationSwitcher } from '@clerk/nextjs';
import { useTheme } from 'antd-style';

export function OrganizationSwitcher() {
  const theme = useTheme();

  return (
    <ClerkOrganizationSwitcher
      afterCreateOrganizationUrl="/teams"
      afterSelectOrganizationUrl="/teams"
      hidePersonal
      appearance={{
        elements: {
          rootBox: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          },
          organizationSwitcherTrigger: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: `1px solid ${theme.colorBorder}`,
            backgroundColor: theme.colorBgContainer,
            '&:hover': {
              backgroundColor: theme.colorBgTextHover,
            },
          },
          organizationSwitcherTriggerIcon: {
            color: theme.colorTextSecondary,
          },
          organizationSwitcherTriggerText: {
            color: theme.colorText,
          },
        },
        variables: {
          borderRadius: '6px',
          colorPrimary: theme.colorPrimary,
          colorDanger: theme.colorError,
          colorSuccess: theme.colorSuccess,
          colorWarning: theme.colorWarning,
          colorText: theme.colorText,
          colorTextSecondary: theme.colorTextSecondary,
          colorBackground: theme.colorBgContainer,
          colorInputBackground: theme.colorBgContainer,
          colorInputText: theme.colorText,
        },
      }}
    />
  );
}
