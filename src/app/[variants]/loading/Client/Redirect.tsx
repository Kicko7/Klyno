'use client';

import { useRouter } from 'next/navigation';
import { memo, useEffect } from 'react';

import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useUserStore } from '@/store/user';

import { AppLoadingStage } from '../stage';
import { useAffiliateStore } from '@/store/affiliate/store';

interface RedirectProps {
  setActiveStage: (value: AppLoadingStage) => void;
}

const Redirect = memo<RedirectProps>(({ setActiveStage }) => {
  const router = useRouter();
  const isUserStateInit = useUserStore((s) => s.isUserStateInit);

  const isPgliteNotEnabled = useGlobalStore(systemStatusSelectors.isPgliteNotEnabled);
  const affiliateRef = localStorage.getItem('affiliateRef');
  const addAffiliateRef = useAffiliateStore((state) => state.addAffiliateRef);
  const updateUserAffiliateRef = useAffiliateStore((state) => state.updateUserAffiliateRef);

  const navToChat = () => {
    setActiveStage(AppLoadingStage.GoToChat);
    router.replace('/chat');
  };

  const handleAffiliateRef = async () => {
    const user = useUserStore.getState().user;
    if(user && affiliateRef) {
      const affiliate = await addAffiliateRef({ link: affiliateRef, userId: user.id });
      updateUserAffiliateRef({ affiliateId: affiliate?.id, userId: user.id });
      localStorage.removeItem('affiliateRef');
    }
  }
  useEffect(() => {
    // if pglite is not enabled, redirect to chat
    // if (isPgliteNotEnabled) {
    //   navToChat();
    //   return;
    // }

    // if user state not init, wait for loading
    if (!isUserStateInit) {
      setActiveStage(AppLoadingStage.InitUser);
      return;
    }

    const user = useUserStore.getState().user;
    if(user && affiliateRef) {
     handleAffiliateRef();
    }

    // finally check the conversation status
    navToChat();
  }, [isUserStateInit, isPgliteNotEnabled]);

  return null;
});

export default Redirect;
