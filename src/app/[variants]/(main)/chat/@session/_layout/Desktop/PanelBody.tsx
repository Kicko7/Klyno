'use client';

import { ScrollShadow } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { PropsWithChildren, memo, useState, useEffect } from 'react';
import { Flexbox } from 'react-layout-kit';

import UpgradePopup from '@/components/UpgradePopup';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';

const useStyles = createStyles(
  ({ css }) => css`
    display: flex;
    flex-direction: column;
    gap: 2px;

    padding-block: 8px 0;
    padding-inline: 8px;
  `,
);

const PanelBody = memo<PropsWithChildren>(({ children }) => {
  const { styles } = useStyles();
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
    // localStorage.setItem('upgrade-popup-dismissed', 'true');
  };

  return (
    <Flexbox style={{ height: '100%', overflow: 'hidden' }}>
      <ScrollShadow className={styles} size={8} style={{ flex: 1 }}>
        {children}
      </ScrollShadow>
      
      {/* Upgrade popup at bottom - only show if user doesn't have active subscription and popup isn't manually closed */}
      {!hasActiveSubscription && showUpgradePopup && (
        <UpgradePopup onClose={handleClosePopup} />
      )}
    </Flexbox>
  );
});

export default PanelBody;
