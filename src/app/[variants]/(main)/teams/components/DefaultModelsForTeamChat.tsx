'use client';

import { App, Card, Checkbox, Input, Skeleton, Switch, Typography } from 'antd';
import { createStyles, useTheme } from 'antd-style';
import { Search, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

import { allModels as openRouterModels } from '@/config/aiModels/openrouter';
import { useEnabledChatModels } from '@/hooks/useEnabledChatModels';
import { lambdaClient } from '@/libs/trpc/client';
import { useOrganizationStore } from '@/store/organization/store';
import { ChatModelCard } from '@/types/llm';

const { Title, Text } = Typography;
const { Search: AntdSearch } = Input;

interface DefaultModelsForTeamChatProps {
  teamChatId: string;
  organizationId: string;
  open: boolean;
  onClose: () => void;
}

interface ModelWithEnabled extends ChatModelCard {
  enabled: boolean;
}

const useStyles = createStyles(({ token, css }) => ({
  saveButton: css`
    padding: ${token.paddingSM}px ${token.padding}px;
    border-radius: ${token.borderRadius}px;
    font-weight: ${token.fontWeightStrong};
    transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
    border: none;
    cursor: pointer;
    
    &:disabled {
      background-color: ${token.colorFillTertiary};
      color: ${token.colorTextDisabled};
      cursor: not-allowed;
    }
    
    &:not(:disabled) {
      background-color: #1890ff;
      color: #ffffff;
      border: 1px solid #1890ff;
      box-shadow: 0 2px 0 rgba(0, 0, 0, 0.045);
      
      &:hover {
        background-color: #40a9ff;
        border-color: #40a9ff;
        box-shadow: 0 4px 8px rgba(24, 144, 255, 0.3);
      }
      
      &:active {
        background-color: #096dd9;
        border-color: #096dd9;
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.045);
      }
    }
  `,
}));

const DefaultModelsForTeamChat = ({
  teamChatId,
  organizationId,
  open,
  onClose,
}: DefaultModelsForTeamChatProps) => {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const theme = useTheme();
  const [models, setModels] = useState<ModelWithEnabled[]>([]);
  const [filteredModels, setFilteredModels] = useState<ModelWithEnabled[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hasChanges, setHasChanges] = useState(false);
  const [teamChatDefaultModels, setTeamChatDefaultModels] = useState<string[]>([]);
  const { getDefaultModels } = useOrganizationStore();
  const enabledChatModels = useEnabledChatModels();
  async function getTeamChatDefaultModels() {
    const data = await lambdaClient.teamChat.getTeamChatDefaultModels.query({ teamChatId });
    setTeamChatDefaultModels(data || []);
    return data;
  }

  async function updateTeamChatDefaultModels(defaultModels: string[]) {
    const data = await lambdaClient.teamChat.updateTeamChatDefaultModels.mutate({
      teamChatId,
      defaultModels,
    });
    return data;
  }

  // Load OpenRouter models from static config and enabled models from settings
  useEffect(() => {
    const loadModels = async () => {
      if (!open) return;

      setLoading(true);

      try {
        // Get team chat default models from API
        const teamDefaultModels = await getTeamChatDefaultModels();
        let modelsToUse = teamDefaultModels || [];

        // If no team chat default models, check organization default models
        if (modelsToUse.length === 0) {
          const orgDefaultModels = await getDefaultModels(organizationId);
          console.log('🔍 No team chat defaults, using org defaults:', orgDefaultModels);
          modelsToUse = orgDefaultModels || [];
        }

        // If no organization default models either, use all enabled models
        if (modelsToUse.length === 0) {
          console.log('🔍 No org defaults either, using all enabled models');
          modelsToUse = openRouterModels
            .filter((model) => model.enabled === true)
            .map((model) => model.id);
        }

        // Get only OpenRouter enabled models from settings
        const settingsEnabledModels = enabledChatModels
          .filter(provider => provider.id === 'openrouter')
          .flatMap(provider => provider.children)
          .filter(model => model.id);

        // Get OpenRouter models from static config
        const staticOpenRouterModels = openRouterModels
          .filter((model) => model.enabled === true);

        // Merge static config models with settings enabled models, removing duplicates
        const allModelsMap = new Map<string, ModelWithEnabled>();
        
        // Add static config models first
        staticOpenRouterModels.forEach(model => {
          allModelsMap.set(model.id, {
            ...model,
            enabled: modelsToUse.includes(model.id),
          });
        });

        // Add settings enabled models (will override static config if duplicate)
        settingsEnabledModels.forEach(model => {
          if (model.id && !allModelsMap.has(model.id)) {
            // Convert AiModelForSelect to ChatModelCard format
            allModelsMap.set(model.id, {
              id: model.id,
              displayName: model.displayName || model.id,
              description: '',
              enabled: modelsToUse.includes(model.id),
              contextWindowTokens: model.contextWindowTokens || 0,
              maxOutput: 0,
              pricing: {
                input: 0,
                output: 0,
              },
            });
          }
        });

        const allEnabledModels = Array.from(allModelsMap.values());

        setModels(allEnabledModels as any);
        setFilteredModels(allEnabledModels as any);
      } catch (error) {
        console.error('Error loading OpenRouter models:', error);
        message.error('Failed to load models. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [teamChatId, organizationId, open, enabledChatModels]);

  // Filter models based on search term and category
  useEffect(() => {
    let filtered = models;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (model) =>
          model.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          model.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          model.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((model) => {
        switch (selectedCategory) {
          case 'free':
            return model.displayName?.toLowerCase().includes('free');
          case 'paid':
            return !model.displayName?.toLowerCase().includes('free');
          default:
            return true;
        }
      });
    }

    setFilteredModels(filtered);
  }, [models, searchTerm, selectedCategory]);

  const handleModelToggle = (modelId: string, enabled: boolean) => {
    setModels((prev) =>
      prev.map((model) => (model.id === modelId ? { ...model, enabled } : model)),
    );
    setHasChanges(true);
  };

  const handleSelectAll = (enabled: boolean) => {
    // Get the IDs of currently filtered models
    const filteredModelIds = filteredModels.map((model) => model.id);

    setModels((prev) =>
      prev.map((model) => (filteredModelIds.includes(model.id) ? { ...model, enabled } : model)),
    );
    setHasChanges(true);
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleMakeChanges = async () => {
    try {
      setIsLoading(true);
      // Get all enabled model IDs
      const enabledModelIds = models.filter((model) => model.enabled).map((model) => model.id);

      // Update team chat default models
      await updateTeamChatDefaultModels(enabledModelIds);

      message.success('Changes saved successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      message.error('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const enabledCount = models.filter((model) => model.enabled).length;
  const totalCount = models.length;

  // Count for currently filtered models
  const filteredEnabledCount = filteredModels.filter((model) => model.enabled).length;
  const filteredTotalCount = filteredModels.length;

  const categories = [
    { key: 'all', label: 'All Models', count: models.length },
    {
      key: 'free',
      label: 'Free Models',
      count: models.filter((m) => m.displayName?.toLowerCase().includes('free')).length,
    },
    {
      key: 'paid',
      label: 'Paid Models',
      count: models.filter((m) => !m.displayName?.toLowerCase().includes('free')).length,
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton.Input active size="large" style={{ width: 300 }} />
          <Skeleton paragraph={{ rows: 2 }} className="mt-2" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton.Input active size="small" style={{ width: 200 }} />
                  <Skeleton.Input active size="small" style={{ width: 150, marginTop: 8 }} />
                </div>
                <Skeleton.Button active />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6 text-blue-500" />
          <Title level={2} className="!mb-0">
            Default Models for Team Chat
          </Title>
        </div>
        <Text type="secondary">
          Configure which OpenRouter models are available for this team chat. Currently{' '}
          {enabledCount} of {totalCount} models are enabled.
        </Text>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <AntdSearch
          placeholder="Search models by name, ID, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          prefix={<Search className="w-4 h-4 text-gray-400" />}
          size="large"
          allowClear
        />

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.key
                  ? 'bg-blue-500 text-white'
                  : theme.appearance === 'dark'
                    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Make Changes Button */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={filteredEnabledCount === filteredTotalCount && filteredTotalCount > 0}
            indeterminate={filteredEnabledCount > 0 && filteredEnabledCount < filteredTotalCount}
            onChange={(e) => handleSelectAll(e.target.checked)}
          >
            {selectedCategory === 'all'
              ? 'Select All'
              : `Select All ${selectedCategory === 'free' ? 'Free' : selectedCategory === 'paid' ? 'Paid' : ''} Models`}
          </Checkbox>
          <Text type="secondary">
            {selectedCategory === 'all'
              ? `${enabledCount} of ${totalCount} models selected`
              : `${filteredEnabledCount} of ${filteredTotalCount} ${selectedCategory === 'free' ? 'free' : selectedCategory === 'paid' ? 'paid' : ''} models selected`}
          </Text>
        </div>

        <button
          onClick={handleMakeChanges}
          disabled={!hasChanges || enabledCount === 0 || isLoading}
          className={styles.saveButton}
        >
          {isLoading ? 'Saving...' : 'Make Changes'}
        </button>
      </div>

      {/* Scrollable Models List */}
      <div className="space-y-3 overflow-y-auto" style={{ height: 'calc(100vh - 400px)' }}>
        {filteredModels.length === 0 ? (
          <Card className="text-center py-8">
            <Text type="secondary">No models found matching your criteria.</Text>
          </Card>
        ) : (
          filteredModels.map((model) => (
            <Card
              key={model.id}
              className={`transition-all duration-200 ${
                model.enabled
                  ? theme.appearance === 'dark'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-blue-500 bg-blue-50'
                  : theme.appearance === 'dark'
                    ? 'border-slate-700 bg-slate-800/50'
                    : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Title level={5} className="!mb-0 truncate">
                      {model.displayName || model.id}
                    </Title>
                    {model.pricing && (
                      <Text type="secondary" className="text-xs">
                        ${model.pricing.input}/${model.pricing.output}
                      </Text>
                    )}
                  </div>

                  <Text type="secondary" className="text-sm block mb-2">
                    {model.id}
                  </Text>

                  {/* Model Capabilities */}
                  <div className="flex flex-wrap gap-1">
                    {model.vision && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Vision
                      </span>
                    )}
                    {model.functionCall && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        Function Call
                      </span>
                    )}
                    {model.reasoning && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Reasoning
                      </span>
                    )}
                    {model.contextWindowTokens && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {model.contextWindowTokens.toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  <Switch
                    checked={model.enabled}
                    onChange={(checked) => handleModelToggle(model.id, checked)}
                    size="default"
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
        <Text type="secondary" className="text-sm">
          <strong>Note:</strong> Only enabled models will be available for this team chat. Changes
          are saved automatically and apply to all team members.
        </Text>
      </div>
    </div>
  );
};

export default DefaultModelsForTeamChat;
