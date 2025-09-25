'use client';

import { ChatHeader } from '@lobehub/ui/chat';
import { Skeleton } from 'antd';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useTeamChatStore } from '@/store/teamChat';

interface TeamChatHeaderProps {
  teamChatId: string;
}

const TeamChatHeader = memo<TeamChatHeaderProps>(({ teamChatId }) => {
  const { teamChatsByOrg, currentOrganizationId } = useTeamChatStore();

  // Get chats for current organization
  const teamChats = currentOrganizationId ? teamChatsByOrg[currentOrganizationId] || [] : [];
  const currentChat = teamChats.find((chat) => chat.id === teamChatId);
  const showHeader = useGlobalStore(systemStatusSelectors.showChatHeader);

  if (!showHeader) return null;

  if (!currentChat) {
    return (
      <ChatHeader
        left={
          <Flexbox align={'center'} gap={8} horizontal>
            <Skeleton
              active
              avatar={{ shape: 'circle', size: 28 }}
              paragraph={false}
              title={{ style: { margin: 0, marginTop: 4 }, width: 200 }}
            />
          </Flexbox>
        }
        style={{ paddingInline: 8, position: 'initial', zIndex: 11 }}
      />
    );
  }

  return <></>;
});

TeamChatHeader.displayName = 'TeamChatHeader';

export default TeamChatHeader;
