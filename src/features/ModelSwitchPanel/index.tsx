import { ActionIcon, Icon } from '@lobehub/ui';
import { Spin } from 'antd';
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
import { useAiInfraStore } from '@/store/aiInfra';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/slices/chat';
import { useOrganizationStore } from '@/store/organization/store';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';
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
    sessionId
      ? agentSelectors.getAgentConfigBySessionId(sessionId)(s)?.model || 'gpt-4'
      : agentSelectors.currentAgentModel(s),
    sessionId
      ? agentSelectors.getAgentConfigBySessionId(sessionId)(s)?.provider || 'openai'
      : agentSelectors.currentAgentModelProvider(s),
    s.updateAgentConfig,
  ]);

  const { showLLM } = useServerConfigStore(featureFlagsSelectors);
  const router = useRouter();
  const enabledList = useEnabledChatModels();
  
  const isLogin = useUserStore(authSelectors.isLogin);
  
  // Get loading state for model list
  const { isLoading: isModelListLoading } = useAiInfraStore((s) => s.useFetchAiProviderRuntimeState(isLogin, undefined));

  const pathname = usePathname();
  const isTeamChat = pathname.includes('teams');
  const activeTeamChatId = useTeamChatStore((state) => state.activeTeamChatId);
  const { defaultModels, selectedOrganizationId, getDefaultModels } = useOrganizationStore();
  const currentOrganization = useOrganizationStore((state) =>
    state.organizations.find((organization) => organization.id === selectedOrganizationId),
  );
  // console.log(currentOrganization)
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

  // Auto-select first default model when user joins team chat
  useEffect(() => {
    if (!isTeamChat || !sessionId || !activeTeamChatId || !enabledList || enabledList.length === 0 || isModelListLoading) {
      return;
    }

    // Use the same filtering logic as items to get the first available model
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
        } else {
          filteredEnabledList = enabledList.filter((provider) => provider.id === 'openrouter');
        }
      }
    }

    // Get the first model from the filtered list (same as what appears first in items)
    if (filteredEnabledList.length > 0) {
      const firstProvider = filteredEnabledList[0];
      if (firstProvider.children.length > 0) {
        const firstModel = firstProvider.children[0];
        
        // Auto-select the first available model
        updateAgentConfig({ model: firstModel.id, provider: firstProvider.id }, sessionId);
        console.log(`Auto-selected first available model: ${firstProvider.id}/${firstModel.id}`);
      }
    }
  }, [sessionId, isModelListLoading]);

  const items = useMemo<ItemType[]>(() => {
    // Show loading state if model list is being fetched
    if (isModelListLoading || !enabledList || enabledList.length === 0) {
      return [
        {
          key: 'loading',
          label: (
            <Flexbox align="center" gap={8} horizontal justify="center" style={{ padding: '12px' }}>
              <Spin size="small" />
              <span style={{ color: theme.colorTextTertiary }}>Loading models...</span>
            </Flexbox>
          ),
          disabled: true,
        },
      ];
    }

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
        else {
          filteredEnabledList = enabledList.filter((provider) => provider.id === 'openrouter');
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
              // Custom URL mapping for specific providers
              const getProviderUrl = (providerId: string, providerName: string) => {
                if (providerId === 'openrouter') {
                  return '/settings/provider/klyno';
                }
                return `/settings/provider/${providerId}`;
              };
              
              router.push(
                isDeprecatedEdition ? '/settings/llm' : getProviderUrl(provider.id, provider.name),
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
          {showLLM &&
            ((isTeamChat && currentOrganization?.memberRole === 'owner') ||
              (!isTeamChat && subscriptionInfo?.subscription?.status === 'active')) && (
              <Link
                href={isDeprecatedEdition ? '/settings/llm' : (provider.id === 'openrouter' && provider.name === 'KlynoAI' ? '/settings/provider/klyno' : `/settings/provider/${provider.id}`)}
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
    isModelListLoading,
    teamChatDefaultModels,
    currentOrganization,
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
