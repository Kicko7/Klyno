import useSWR, { SWRResponse, mutate } from 'swr';
import type { StateCreator } from 'zustand/vanilla';

import { DEFAULT_PREFERENCE } from '@/const/user';
import { useOnlyFetchOnceSWR } from '@/libs/swr';
import { userService } from '@/services/user';
import type { UserStore } from '@/store/user';
import type { GlobalServerConfig } from '@/types/serverConfig';
import { UserInitializationState } from '@/types/user';
import { setNamespace } from '@/utils/storeDebug';

import { preferenceSelectors } from '../preference/selectors';

const n = setNamespace('common');

const GET_USER_STATE_KEY = 'initUserState';
/**
 * 设置操作
 */
export interface CommonAction {
  refreshUserState: () => Promise<void>;

  updateAvatar: (avatar: string) => Promise<void>;
  useCheckTrace: (shouldFetch: boolean) => SWRResponse;
  useInitUserState: (
    isLogin: boolean | undefined,
    serverConfig: GlobalServerConfig,
    options?: {
      onSuccess: (data: UserInitializationState) => void;
    },
  ) => SWRResponse;
}

export const createCommonSlice: StateCreator<
  UserStore,
  [['zustand/devtools', never]],
  [],
  CommonAction
> = (set, get) => ({
  refreshUserState: async () => {
    await mutate(GET_USER_STATE_KEY);
  },
  updateAvatar: async (avatar) => {
    // 1. 更新服务端/数据库中的头像
    await userService?.updateAvatar(avatar);

    await get().refreshUserState();
  },

  useCheckTrace: (shouldFetch) =>
    useSWR<boolean>(
      shouldFetch ? 'checkTrace' : null,
      () => {
        const userAllowTrace = preferenceSelectors.userAllowTrace(get());

        // if user have set the trace, return false
        if (typeof userAllowTrace === 'boolean') return Promise.resolve(false);

        return Promise.resolve(get().isUserCanEnableTrace);
      },
      {
        revalidateOnFocus: false,
      },
    ),

  useInitUserState: (isLogin, _serverConfig, _options) =>
    useOnlyFetchOnceSWR<UserInitializationState>(
      !!isLogin ? GET_USER_STATE_KEY : null,
      async () => {
        if (!userService) throw new Error('userService is not available');
        return userService.getUserState();
      },
      {
        onSuccess: (data: UserInitializationState) => {
          const isEmpty = Object.keys(data.preference || {}).length === 0;
          const preference = isEmpty ? DEFAULT_PREFERENCE : data.preference;
          set(
            {
              isOnboard: data.isOnboard,
              isShowPWAGuide: data.canEnablePWAGuide,
              isUserCanEnableTrace: data.canEnableTrace,
              isUserHasConversation: data.hasConversation,
              preference,
              settings: data.settings || {},
              user: {
                avatar: data.avatar || data.userId,
                email: data.email,
                firstName: data.firstName,
                fullName: data.fullName,
                id: data.userId || '',
                latestName: data.lastName,
                username: data.username,
              },
            },
            false,
            n('initUserState'),
          );
        },
      },
    ),
});
