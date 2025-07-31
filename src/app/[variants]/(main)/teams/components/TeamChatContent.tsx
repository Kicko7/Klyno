'use client';

import React, { useEffect, Suspense } from 'react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';
import { useTeamChatStore } from '@/store/teamChat';
import TeamChatLayout from './layout/TeamChatLayout';

interface TeamChatContentProps {
  teamChatId: string;
  mobile: boolean;
  onNewChat: () => Promise<void>;
}

const TeamChatContent: React.FC<TeamChatContentProps> = memo(({ teamChatId, mobile, onNewChat }) => {
  const { teamChats, loadMessages, setActiveTeamChat } = useTeamChatStore();

  // Find the current chat
  const currentChat = teamChats.find(chat => chat.id === teamChatId);

  useEffect(() => {
    // Ensure this chat remains active
    setActiveTeamChat(teamChatId);
    
    // Load messages when the chat is activated
    if (teamChatId) {
      loadMessages(teamChatId);
    }
  }, [teamChatId, setActiveTeamChat, loadMessages]);

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <p>No active chat found.</p>
          <button 
            onClick={onNewChat}
            className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
          >
            Create New Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TeamChatLayout teamChatId={teamChatId} mobile={mobile} />
    </div>
  );
});

TeamChatContent.displayName = 'TeamChatContent';

export default TeamChatContent;

