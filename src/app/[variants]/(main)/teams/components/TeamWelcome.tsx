import React from 'react';
import KlynoWelcome from '@/components/KlynoWelcome';
import { useOrganizationStore } from '@/store/organization/store';
import { useTeamChatStore } from '@/store/teamChat';
import { useTheme } from 'antd-style';

const TeamWelcome = () => {
  const { organizations } = useOrganizationStore();
  const currentOrganization = organizations[0];
  const theme = useTheme();

  return (
    <div
      className={`flex flex-col h-full w-full ${
        theme.appearance === 'dark' ? 'bg-black' : 'bg-white'
      }`}
    >
      {/* Welcome Section */}
      <div className="flex-1 flex items-center justify-center px-4">
        <KlynoWelcome
          showTeamFeatures
          organizationName={currentOrganization?.name}
        />
      </div>

      {/* Chat Input - Sticks to bottom */}
      <div
        className={`w-full border-gray-600/30 ${
          theme.appearance === 'dark' ? 'bg-black' : 'bg-white'
        }`}
      >
        {/* <div className="mx-auto py-4">
          <TeamChatInput teamChatId={activeTeamChatId ?? ''} />
        </div> */}
      </div>
    </div>
  );
};

export default TeamWelcome;
