'use client';

import { PropsWithChildren, useState, useEffect } from 'react';
import { Flexbox } from 'react-layout-kit';

import MobileContentLayout from '@/components/server/MobileNavLayout';
import UpgradePopup from '@/components/UpgradePopup';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';

import SessionSearchBar from '../../features/SessionSearchBar';
import SessionHeader from './SessionHeader';

const MobileLayout = ({ children }: PropsWithChildren) => {
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const { hasActiveSubscription } = useUserSubscription();
  
  // Get session loading states
  const isSessionListInit = useSessionStore(sessionSelectors.isSessionListInit);
  const hasCustomAgents = useSessionStore(sessionSelectors.hasCustomAgents);

  // Show popup after sessions are fully loaded
  useEffect(() => {
    const dismissed = localStorage.getItem('upgrade-popup-dismissed');
    if (dismissed === 'true') {
      return; // Don't show if previously dismissed
    }

    // Show when sessions are initialized (whether or not there are default assistants)
    if (isSessionListInit) {
      setShowUpgradePopup(true);
    }
  }, [isSessionListInit]);
  
  const handleClosePopup = () => {
    setShowUpgradePopup(false);
    localStorage.setItem('upgrade-popup-dismissed', 'true');
  };

  return (
    <MobileContentLayout header={<SessionHeader />} withNav>
      <Flexbox style={{ height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px', flex: 1, overflow: 'auto' }}>
          <SessionSearchBar mobile />
          {children}
        </div>
        
        {/* Upgrade popup at bottom - only show if user doesn't have active subscription and popup isn't manually closed */}
        {!hasActiveSubscription && showUpgradePopup && (
          <UpgradePopup onClose={handleClosePopup} />
        )}
      </Flexbox>
      {/* ↓ cloud slot ↓ */}

      {/* ↑ cloud slot ↑ */}
    </MobileContentLayout>
  );
};

export default MobileLayout;
