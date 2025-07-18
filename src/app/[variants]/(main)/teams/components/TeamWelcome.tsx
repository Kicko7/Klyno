import { useResponsive } from 'antd-style';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import ChatInput from '@/app/[variants]/(main)/chat/(workspace)/@conversation/features/ChatInput';
import KlynoWelcome from '@/components/KlynoWelcome';
import { useChatStore } from '@/store/chat';
import { useOrganizationStore } from '@/store/organization/store';

const TeamWelcome = () => {
  const router = useRouter();
  const { mobile } = useResponsive();
  const { organizations } = useOrganizationStore();
  const currentOrganization = organizations[0];
  const [inputMessage] = useChatStore((s) => [s.inputMessage]);

  const handleSendMessage = useCallback(() => {
    // Only navigate if there's a message to send
    if (inputMessage.trim()) {
      router.push('/teams?view=chat');
    }
  }, [router, inputMessage]);

  return (
    <div className="flex flex-col h-full w-full bg-black">
      {/* Welcome Section - Centered */}
      <div className="flex-1 flex items-center justify-center">
        <KlynoWelcome showTeamFeatures={true} organizationName={currentOrganization?.name} />
      </div>

      {/* Chat Input - Fixed at bottom */}
      <div className="w-full  bg-black border-t border-gray-600/30">
        <div className=" mx-auto">
          <ChatInput mobile={mobile || false} onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  );
};

export default TeamWelcome;
