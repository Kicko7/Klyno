'use client';

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import { RobotOutlined } from '@ant-design/icons';
import { Users } from 'lucide-react';

import { useSessionStore } from '@/store/session';
import { sessionMetaSelectors } from '@/store/session/slices/session/selectors';

const TeamChatWelcome = memo(() => {
  const { t } = useTranslation('chat');
  const agentMeta = useSessionStore(sessionMetaSelectors.currentAgentMeta);

  return (
    <Flexbox
      align={'center'}
      flex={1}
      gap={16}
      justify={'center'}
      style={{
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <Flexbox
        align={'center'}
        gap={12}
        horizontal
        style={{
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            padding: '16px',
            color: 'white',
          }}
        >
          <RobotOutlined style={{ fontSize: '32px' }} />
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: '50%',
            padding: '16px',
            color: 'white',
          }}
        >
          <Users size={32} />
        </div>
      </Flexbox>

      <Flexbox gap={8} style={{ maxWidth: '500px' }}>
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Welcome to Team AI Chat! 🤖✨
        </h2>
        
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280', 
          margin: '0 0 16px 0',
          lineHeight: '1.6'
        }}>
          Collaborate with your team members and get AI assistance together. 
          Everyone can see the conversation and contribute to the discussion.
        </p>

        <div
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
          }}
        >
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            margin: '0 0 12px 0',
            color: '#1f2937'
          }}>
            How it works:
          </h3>
          <ul style={{ 
            textAlign: 'left', 
            color: '#4b5563',
            margin: 0,
            paddingLeft: '20px',
            lineHeight: '1.8'
          }}>
            <li>💬 Type your message or question below</li>
            <li>🤖 AI Assistant ({agentMeta.title || 'Default Assistant'}) will respond</li>
            <li>👥 All team members can see and participate</li>
            <li>🔄 Continue the conversation collaboratively</li>
          </ul>
        </div>

        <div style={{ 
          fontSize: '14px', 
          color: '#9ca3af', 
          marginTop: '24px',
          fontStyle: 'italic'
        }}>
          Start by typing your first message below! 👇
        </div>
      </Flexbox>
    </Flexbox>
  );
});

TeamChatWelcome.displayName = 'TeamChatWelcome';

export default TeamChatWelcome;
