'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import TeamChatLayout from './layout/TeamChatLayout';

interface TeamChatContentProps {
  teamChatId: string;
  mobile: boolean;
  onNewChat: () => Promise<void>;
}

const TeamChatContent: React.FC<TeamChatContentProps> = memo(
  ({ teamChatId, mobile, onNewChat }) => {
    const { teamChatsByOrg, loadMessages, setActiveTeamChat, currentOrganizationId } =
      useTeamChatStore();
    const currentUser = useUserStore(userProfileSelectors.userProfile);

    // Get chats for current organization
    const teamChats = currentOrganizationId ? teamChatsByOrg[currentOrganizationId] || [] : [];

    // Find the current chat
    const currentChat = teamChats.find((chat) => chat.id === teamChatId);

    const [messagesLoaded, setMessagesLoaded] = useState(false);

    useEffect(() => {
      // Reset loaded state when chat changes
      setMessagesLoaded(false);
    }, [teamChatId]);

    useEffect(() => {
      // Load messages only once when the chat is activated
      if (teamChatId && !messagesLoaded) {
        console.log('📨 Loading messages for team chat:', teamChatId);
        loadMessages(teamChatId)
          .then(() => {
            setMessagesLoaded(true);
            console.log('✅ Messages loaded successfully for:', teamChatId);
          })
          .catch((error) => {
            console.error('❌ Failed to load messages:', error);
          });
      }
    }, [teamChatId, loadMessages, messagesLoaded]);

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
  },
);

TeamChatContent.displayName = 'TeamChatContent';

export default TeamChatContent;
