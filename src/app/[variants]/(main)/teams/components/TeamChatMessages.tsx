'use client';

import React from 'react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';
import { TeamChatMessageItem } from '@/database/schemas/teamChat';

interface TeamChatMessagesProps {
  messages: TeamChatMessageItem[];
  isLoading?: boolean;
}

const TeamChatMessages: React.FC<TeamChatMessagesProps> = memo(({ messages, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div>Loading messages...</div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="mb-4">
            <div className="text-lg font-semibold text-white mb-2">Welcome to your team chat!</div>
            <p className="text-sm">Start a conversation with your team members.</p>
            <p className="text-xs mt-1">Send your first message below.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Flexbox
      flex={1}
      style={{
        overflowX: 'hidden',
        overflowY: 'auto',
        position: 'relative',
        padding: '16px',
      }}
      width={'100%'}
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`mb-4 ${
            message.messageType === 'user' 
              ? 'ml-auto max-w-[70%]' 
              : 'mr-auto max-w-[70%]'
          }`}
        >
          <div
            className={`p-3 rounded-lg ${
              message.messageType === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-white'
            }`}
            style={{
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.content}
          </div>
          <div className="text-xs text-gray-400 mt-1 px-1">
            {new Date(message.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </Flexbox>
  );
});

TeamChatMessages.displayName = 'TeamChatMessages';

export default TeamChatMessages;
