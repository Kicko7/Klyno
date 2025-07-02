import type { Migration, MigrationData } from '@/migrations/VersionController';
import { transformToChatModelCards } from '@/utils/_deprecated/parseModels';

import { V3ConfigState, V3LegacyConfig, V3OpenAIConfig, V3Settings } from './types/v3';
import { V4AzureOpenAIConfig, V4ConfigState, V4ProviderConfig, V4Settings } from './types/v4';

export class MigrationV3ToV4 implements Migration {
  // from this version to start migration
  version = 3;

  migrate(data: MigrationData<V3ConfigState>): MigrationData<V4ConfigState> {
    const { settings } = data.state;

    return {
      ...data,
      state: {
        ...data.state,
        settings: !settings ? undefined : MigrationV3ToV4.migrateSettings(settings),
      },
    };
  }

  static migrateSettings = (settings: V3Settings): V4Settings => {
    const { languagemodel } = settings;

    if (!languagemodel) return { ...settings, languageModel: undefined };

    const { openai, togetherai, openrouter, ollama, ...res } = languagemodel;
    const { openai: openaiConfig, azure } = this.migrateOpenAI(openai);

    return {
      ...settings,
      languageModel: {
        ...res,
        azure,
        ollama: ollama && this.migrateProvider(ollama),
        openai: openaiConfig,
        openrouter: openrouter && this.migrateProvider(openrouter),
        togetherai: togetherai && this.migrateProvider(togetherai),
      },
    };
  };

  static migrateOpenAI = (
    openai?: V3OpenAIConfig,
  ): { azure: V4AzureOpenAIConfig; openai: V4ProviderConfig } => {
    if (!openai)
      return {
        azure: { apiKey: '', enabled: false },
        openai: { apiKey: '', enabled: true },
      };

    if (openai.useazure) {
      return {
        azure: {
          apiKey: openai.openai_api_key,
          apiVersion: openai.azureapiversion,
          enabled: true,
          endpoint: openai.endpoint,
        },
        openai: { apiKey: '', enabled: true, endpoint: '' },
      };
    }

    const customModelCards = transformToChatModelCards({
      defaultChatModels: [],
      modelString: openai.custommodelname,
    });

    return {
      azure: {
        apiKey: '',
        enabled: false,
        endpoint: '',
      },
      openai: {
        apiKey: openai.openai_api_key,
        customModelCards:
          customModelCards && customModelCards.length > 0 ? customModelCards : undefined,
        enabled: true,
        endpoint: openai.endpoint,
      },
    };
  };

  static migrateProvider = (provider: V3LegacyConfig): V4ProviderConfig => {
    const customModelCards = transformToChatModelCards({
      defaultChatModels: [],
      modelString: provider.custommodelname,
    });

    return {
      apiKey: provider.apikey,
      customModelCards:
        customModelCards && customModelCards.length > 0 ? customModelCards : undefined,
      enabled: provider.enabled,
      endpoint: provider.endpoint,
    };
  };
}

export const MigrationLLMSettings = MigrationV3ToV4;
