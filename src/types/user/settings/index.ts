import type { LobeAgentSettings } from '@/types/session';

import { FilesConfig } from './filesConfig';
import { UserGeneralConfig } from './general';
import { UserHotkeyConfig } from './hotkey';
import { UserKeyVaults } from './keyVaults';
import { UserModelProviderConfig } from './modelProvider';
import { UserSyncSettings } from './sync';
import { UserSystemAgentConfig } from './systemAgent';
import { UserToolConfig } from './tool';
import { UserTTSConfig } from './tts';

export type UserDefaultAgent = LobeAgentSettings;

export * from './filesConfig';
export * from './general';
export * from './hotkey';
export * from './keyVaults';
export * from './modelProvider';
export * from './sync';
export * from './systemAgent';
export * from './tts';

/**
 * 配置设置
 */
export interface UserSettings {
  defaultAgent: UserDefaultAgent;
  filesConfig?: FilesConfig;
  general: UserGeneralConfig;
  hotkey: UserHotkeyConfig;
  keyVaults: UserKeyVaults;
  languageModel: UserModelProviderConfig;
  sync?: UserSyncSettings;
  systemAgent: UserSystemAgentConfig;
  tool: UserToolConfig;
  tts: UserTTSConfig;
}
