import React, { useCallback, useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTeamChatStore } from '@/store/teamChat';
import { useTeamChatRoute } from '@/hooks/useTeamChatRoute';

interface NewTeamChatButtonProps {
  organizationId: string;
  teamId: string;
  disabled?: boolean;
  className?: string;
}

const NewTeamChatButton: React.FC<NewTeamChatButtonProps> = ({ 
  organizationId, 
  teamId, 
  disabled = false,
  className 
}) => {
  const [loading, setLoading] = useState(false);
  const { createNewTeamChatWithTopic } = useTeamChatStore();
  const { createNewTeamChat } = useTeamChatRoute();

  const handleCreateNewChat = useCallback(async () => {
    if (loading || disabled) return;
    
    setLoading(true);
    try {
      console.log('🎯 Creating new team chat with routing...');
      
      // Create new team chat with topic ID
      const { teamChatId, topicId } = await createNewTeamChatWithTopic(organizationId, 'New Chat');
      
      // Navigate to the new chat with topic ID in URL
      createNewTeamChat(teamId, topicId);
      
      console.log('✅ New team chat created and navigated:', { teamChatId, topicId });
    } catch (error) {
      console.error('❌ Failed to create new team chat:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, disabled, organizationId, teamId, createNewTeamChatWithTopic, createNewTeamChat]);

  return (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={handleCreateNewChat}
      loading={loading}
      disabled={disabled}
      className={className}
    >
      New Chat
    </Button>
  );
};

export default NewTeamChatButton;
