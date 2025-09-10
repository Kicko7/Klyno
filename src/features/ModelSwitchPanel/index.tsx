import { ActionIcon, Icon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import type { ItemType } from 'antd/es/menu/interface';
import { LucideArrowRight, LucideBolt } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { ModelItemRender, ProviderItemRender } from '@/components/ModelSelect';
import { isDeprecatedEdition } from '@/const/version';
import ActionDropdown from '@/features/ChatInput/ActionBar/components/ActionDropdown';
import { useEnabledChatModels } from '@/hooks/useEnabledChatModels';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { lambdaClient } from '@/libs/trpc/client';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/slices/chat';
import { useOrganizationStore } from '@/store/organization/store';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useTeamChatStore } from '@/store/teamChat';
import { EnabledProviderWithModels } from '@/types/aiProvider';

const useStyles = createStyles(({ css, prefixCls }) => ({
  menu: css`
    .${prefixCls}-dropdown-menu-item {
      display: flex;
      gap: 8px;
    }
    .${prefixCls}-dropdown-menu {
      &-item-group-title {
        padding-inline: 8px;
      }

      &-item-group-list {
        margin: 0 !important;
      }
    }
  `,
  tag: css`
    cursor: pointer;
  `,
}));

const menuKey = (provider: string, model: string) => `${provider}-${model}`;

interface IProps {
  children?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  updating?: boolean;
  sessionId?: string;
}

const ModelSwitchPanel = memo<IProps>(({ children, onOpenChange, open, sessionId }) => {
  const { t } = useTranslation('components');
  const { styles, theme } = useStyles();
  const [model, provider, updateAgentConfig] = useAgentStore((s) => [
    agentSelectors.currentAgentModel(s),
    agentSelectors.currentAgentModelProvider(s),
    s.updateAgentConfig,
  ]);
  const { showLLM } = useServerConfigStore(featureFlagsSelectors);
  const router = useRouter();
  const enabledList = useEnabledChatModels();

  const pathname = usePathname();
  const isTeamChat = pathname.includes('teams');
  const activeTeamChatId = useTeamChatStore((state) => state.activeTeamChatId);
  const { defaultModels, selectedOrganizationId, getDefaultModels } = useOrganizationStore();
  const currentOrganization = useOrganizationStore((state) => state.organizations.find((organization) => organization.id === selectedOrganizationId));
  console.log(currentOrganization)
  const { subscriptionInfo } = useUserSubscription();
  const [teamChatDefaultModels, setTeamChatDefaultModels] = useState<string[]>([]);

  async function getTeamChatDefaultModels() {
    const data = await lambdaClient.teamChat.getTeamChatDefaultModels.query({
      teamChatId: activeTeamChatId as string,
    });
    setTeamChatDefaultModels(data || []);
    return data;
  }

  useEffect(() => {
    if (selectedOrganizationId && activeTeamChatId) {
      getTeamChatDefaultModels();
      getDefaultModels(selectedOrganizationId);
    }
  }, [activeTeamChatId]);

  const items = useMemo<ItemType[]>(() => {
    // Filter models based on team chat, subscription, and organization default models
    let filteredEnabledList = enabledList;

    if (isTeamChat) {
      // In team chat: show organization default models, if empty then show all models

      if (teamChatDefaultModels.length > 0) {
        filteredEnabledList = enabledList
          .map((provider) => ({
            ...provider,
            children: provider.children.filter((model) => teamChatDefaultModels.includes(model.id)),
          }))
          .filter((provider) => provider.children.length > 0);
      } else {
        if (selectedOrganizationId && defaultModels.length > 0) {
          const orgDefaultModels = defaultModels;
          filteredEnabledList = enabledList
            .map((provider) => ({
              ...provider,
              children: provider.children.filter((model) => orgDefaultModels.includes(model.id)),
            }))
            .filter((provider) => provider.children.length > 0);
        }
      }

      // If no default models, show all enabled models (filteredEnabledList remains as enabledList)
    } else {
      // Not in team chat: check subscription
      if (!subscriptionInfo || subscriptionInfo.subscription?.status !== 'active') {
        // No subscription: show only free models
        filteredEnabledList = enabledList
          .map((provider) => ({
            ...provider,
            children: provider.children.filter((model) => model.id.toLowerCase().includes('free')),
          }))
          .filter((provider) => provider.children.length > 0);
      }
      // If subscribed, show all enabled models (filteredEnabledList remains as enabledList)
    }

    const getModelItems = (provider: EnabledProviderWithModels) => {
      const items = provider.children.map((model) => ({
        key: menuKey(provider.id, model.id),
        label: <ModelItemRender {...model} {...model.abilities} />,
        onClick: async () => {
          if (sessionId) {
            await updateAgentConfig({ model: model.id, provider: provider.id }, sessionId);
          } else {
            await updateAgentConfig({ model: model.id, provider: provider.id });
          }
        },
      }));

      // if there is empty items, add a placeholder guide
      if (items.length === 0)
        return [
          {
            key: `${provider.id}-empty`,
            label: (
              <Flexbox gap={8} horizontal style={{ color: theme.colorTextTertiary }}>
                {t('ModelSwitchPanel.emptyModel')}
                <Icon icon={LucideArrowRight} />
              </Flexbox>
            ),
            onClick: () => {
              router.push(
                isDeprecatedEdition ? '/settings/llm' : `/settings/provider/${provider.id}`,
              );
            },
          },
        ];

      return items;
    };

    if (filteredEnabledList.length === 0)
      return [
        {
          key: `no-provider`,
          label: (
            <Flexbox gap={8} horizontal style={{ color: theme.colorTextTertiary }}>
              {isTeamChat
                ? 'No models available for this organization'
                : !subscriptionInfo
                  ? 'No free models available'
                  : t('ModelSwitchPanel.emptyProvider')}
              <Icon icon={LucideArrowRight} />
            </Flexbox>
          ),
          onClick: () => {
            router.push(isDeprecatedEdition ? '/settings/llm' : `/settings/provider`);
          },
        },
      ];

    // otherwise show with provider group
    return filteredEnabledList.map((provider) => ({
      children: getModelItems(provider),
      key: provider.id,
      label: (
        <Flexbox horizontal justify="space-between">
          <ProviderItemRender
            logo={provider.logo}
            name={provider.name}
            provider={provider.id}
            source={provider.source}
          />
          {showLLM && (
            (isTeamChat && currentOrganization?.memberRole === 'owner') ||
            (!isTeamChat && subscriptionInfo?.subscription?.status === 'active')
          ) && (
            <Link
              href={isDeprecatedEdition ? '/settings/llm' : `/settings/provider/${provider.id}`}
            >
              <ActionIcon
                icon={LucideBolt}
                size={'small'}
                title={t('ModelSwitchPanel.goToSettings')}
              />
            </Link>
          )}
        </Flexbox>
      ),
      type: 'group',
    }));
  }, [
    enabledList,
    isTeamChat,
    selectedOrganizationId,
    defaultModels,
    subscriptionInfo,
    t,
    theme.colorTextTertiary,
    router,
    showLLM,
    updateAgentConfig,
    sessionId,
  ]);

  const icon = <div className={styles.tag}>{children}</div>;

  return (
    <ActionDropdown
      menu={{
        // @ts-expect-error 等待 antd 修复
        activeKey: menuKey(provider, model),
        className: styles.menu,
        items,
        // 不加限高就会导致面板超长，顶部的内容会被隐藏
        // https://github.com/user-attachments/assets/9c043c47-42c5-46ef-b5c1-bee89376f042
        style: {
          maxHeight: 500,
          overflowY: 'scroll',
        },
      }}
      onOpenChange={onOpenChange}
      open={open}
      placement={'topLeft'}
    >
      {icon}
    </ActionDropdown>
  );
});

export default ModelSwitchPanel;
