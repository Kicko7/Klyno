import { ActionIcon } from '@lobehub/ui';
import { Maximize2, Minimize2 } from 'lucide-react';
import { memo } from 'react';

import ActionBar from '@/features/ChatInput/ActionBar';
import { ActionKeys } from '@/features/ChatInput/types';
import CreditTag from './credit/creditsTag'; // 👈 Import your CreditTag component

interface HeaderProps {
  expand: boolean;
  leftActions: ActionKeys[];
  rightActions: ActionKeys[];
  setExpand: (expand: boolean) => void;
  sessionId?: string;
  teamChatId?: string; // 👈 Add teamChatId prop
  organizationSubscriptionInfo?: any; // 👈 Add organizationSubscriptionInfo prop
}

const Header = memo<HeaderProps>(({ 
  expand, 
  setExpand, 
  leftActions, 
  rightActions, 
  sessionId,
  teamChatId ,
  organizationSubscriptionInfo
}) => (
  <ActionBar
    leftActions={leftActions}
    rightActions={rightActions}
    sessionId={sessionId}
    rightAreaEndRender={
      <>
        {/* Show credit tag only if teamChatId is provided */}
        {teamChatId && <CreditTag teamChatId={teamChatId} organizationSubscriptionInfo={organizationSubscriptionInfo} />}
        <ActionIcon
          icon={expand ? Minimize2 : Maximize2}
          onClick={() => {
            setExpand(!expand);
          }}
        />
      </>
    }
  />
));

export default Header;
