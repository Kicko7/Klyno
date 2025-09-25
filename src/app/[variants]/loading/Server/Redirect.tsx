'use client';

import { useRouter } from 'next/navigation';
import { memo, useEffect, useState } from 'react';

import { useAffiliateStore } from '@/store/affiliate/store';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

import { AppLoadingStage } from '../stage';

interface RedirectProps {
  setLoadingStage: (value: AppLoadingStage) => void;
}

const Redirect = memo<RedirectProps>(({ setLoadingStage }) => {
  const router = useRouter();
  const [isLogin, isLoaded, isUserStateInit, isOnboard] = useUserStore((s) => [
    authSelectors.isLogin(s),
    authSelectors.isLoaded(s),
    s.isUserStateInit,
    s.isOnboard,
  ]);
  const [affiliateRef, setAffiliateRef] = useState<string | null>(null);
  const addAffiliateRef = useAffiliateStore((state) => state.addAffiliateRef);
  const updateUserAffiliateRef = useAffiliateStore((state) => state.updateUserAffiliateRef);

  const navToChat = () => {
    setLoadingStage(AppLoadingStage.GoToChat);
    router.replace('/chat');
  };

  const handleAffiliateRef = async () => {
    const user = useUserStore.getState().user;
    if(user && affiliateRef) {
      const affiliate = await addAffiliateRef({ link: affiliateRef, userId: user.id });
      updateUserAffiliateRef({ affiliateId: affiliate?.id, userId: user.id });
      localStorage.removeItem('affiliateRef');
      setAffiliateRef(null);
    }
  }

  // Safely get affiliateRef from localStorage on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ref = localStorage.getItem('affiliateRef');
      setAffiliateRef(ref);
    }
  }, []);

  useEffect(() => {
    // if user auth state is not ready, wait for loading
    if (!isLoaded) {
      setLoadingStage(AppLoadingStage.InitAuth);
      return;
    }

    // this mean user is definitely not login
    if (!isLogin) {
      navToChat();
      return;
    }

    // if user state not init, wait for loading
    if (!isUserStateInit) {
      setLoadingStage(AppLoadingStage.InitUser);
      return;
    }

    // user need to onboard
    if (!isOnboard) {
      router.replace('/onboard');
      return;
    }

    const user = useUserStore.getState().user;
    // console.log('User state initialized', user, affiliateRef);
    if (user && affiliateRef) {
     handleAffiliateRef();
    }

    // finally go to chat
    navToChat();
  }, [isUserStateInit, isLoaded, isOnboard, isLogin]);

  return null;
});

export default Redirect;
