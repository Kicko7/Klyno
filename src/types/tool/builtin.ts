import { LobeChatPluginApi, Meta } from '@lobehub/chat-plugin-sdk';
import { ReactNode } from 'react';

export interface BuiltinToolManifest {
  api: LobeChatPluginApi[];

  /**
   * Plugin name
   */
  identifier: string;
  /**
   * metadata
   * @desc Meta data of the plugin
   */
  meta: Meta;
  systemRole: string;
  /**
   * plugin runtime type
   * @default default
   */
  type?: 'builtin';
}

export interface LobeBuiltinTool {
  hidden?: boolean;
  identifier: string;
  manifest: BuiltinToolManifest;
  type: 'builtin';
}

export interface BuiltinRenderProps<Content = unknown, Arguments = unknown, State = unknown> {
  apiName?: string;
  args: Arguments;
  content: Content;
  identifier?: string;
  messageId: string;
  pluginError?: unknown;
  pluginState?: State;
}

export type BuiltinRender = <T = unknown>(props: BuiltinRenderProps<T>) => ReactNode;

export interface BuiltinPortalProps<Arguments = Record<string, unknown>, State = unknown> {
  apiName?: string;
  arguments: Arguments;
  identifier: string;
  messageId: string;
  state: State;
}

export type BuiltinPortal = <T = unknown>(props: BuiltinPortalProps<T>) => ReactNode;
