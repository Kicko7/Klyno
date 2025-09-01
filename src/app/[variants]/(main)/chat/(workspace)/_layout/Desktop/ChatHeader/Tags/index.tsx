import { ModelTag } from '@lobehub/icons';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import ModelSwitchPanel from '@/features/ModelSwitchPanel';
import PluginTag from '@/features/PluginTag';
import { useAgentEnableSearch } from '@/hooks/useAgentEnableSearch';
import { useModelSupportToolUse } from '@/hooks/useModelSupportToolUse';
import { useAgentStore } from '@/store/agent';
import { agentChatConfigSelectors, agentSelectors } from '@/store/agent/selectors';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import HistoryLimitTags from './HistoryLimitTags';
import KnowledgeTag from './KnowledgeTag';
import SearchTags from './SearchTags';

const useStyles = createStyles(({ css, token }) => ({
  modelSwitchButton: css`
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 6px;
    background: ${token.colorFillTertiary};
    border: 1px solid ${token.colorBorder};
    transition: all 0.2s ease;
    
    &:hover {
      background: ${token.colorFillSecondary};
      border-color: ${token.colorPrimary};
      transform: scale(1.05);
    }
    
    &:active {
      transform: scale(0.98);
    }
  `,
}));

const TitleTags = memo(() => {
  const { styles } = useStyles();
  const [model, provider, hasKnowledge, isLoading] = useAgentStore((s) => [
    agentSelectors.currentAgentModel(s),
    agentSelectors.currentAgentModelProvider(s),
    agentSelectors.hasKnowledge(s),
    agentSelectors.isAgentConfigLoading(s),
  ]);

  const plugins = useAgentStore(agentSelectors.currentAgentPlugins, isEqual);
  const enabledKnowledge = useAgentStore(agentSelectors.currentEnabledKnowledge, isEqual);
  const enableHistoryCount = useAgentStore(agentChatConfigSelectors.enableHistoryCount);

  const showPlugin = useModelSupportToolUse(model, provider);
  const isLogin = useUserStore(authSelectors.isLogin);

  const isAgentEnableSearch = useAgentEnableSearch();

  return isLoading && isLogin ? (
    <Skeleton.Button active size={'small'} style={{ height: 20 }} />
  ) : (
    <Flexbox align={'center'} gap={4} horizontal>
      <ModelSwitchPanel>
        <div className={styles.modelSwitchButton}>
          <ModelTag model={model} />
        </div>
      </ModelSwitchPanel>
      {isAgentEnableSearch && <SearchTags />}
      {showPlugin && plugins?.length > 0 && <PluginTag plugins={plugins} />}
      {hasKnowledge && <KnowledgeTag data={enabledKnowledge} />}
      {enableHistoryCount && <HistoryLimitTags />}
    </Flexbox>
  );
});

export default TitleTags;
