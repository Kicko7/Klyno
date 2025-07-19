import React from 'react';

import KlynoWelcome from '@/components/KlynoWelcome';
import { useOrganizationStore } from '@/store/organization/store';

import TeamChatInput from './TeamChatInput';

const TeamWelcome = () => {
  const { organizations } = useOrganizationStore();
  const currentOrganization = organizations[0];

  return (
    <div className="flex flex-col h-full w-full bg-black">
      {/* Welcome Section - Centered */}
      <div className="flex-1 flex items-center justify-center">
        <KlynoWelcome showTeamFeatures={true} organizationName={currentOrganization?.name} />
      </div>

      {/* Chat Input - Fixed at bottom */}
      <div className="w-full p-6 bg-black border-t border-gray-600/30">
        <div className=" mx-auto">
          <TeamChatInput />
        </div>
      </div>
    </div>
  );
};
export default TeamWelcome;
