'use client';

import { Modal, Button, Select, Avatar, Typography, Tag, Space } from 'antd';
import { UserAddOutlined, TeamOutlined } from '@ant-design/icons';
import { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useTeamChatStore } from '@/store/teamChat';
import { useUserStore } from '@/store/user';

const { Text, Title } = Typography;
const { Option } = Select;

interface AddMembersModalProps {
  open: boolean;
  onClose: () => void;
  teamChatId: string;
  organizationId: string;
}

// Mock organization members - in real app, this would come from your organization API
const mockOrgMembers = [
  {
    id: 'user_1',
    name: 'John Doe',
    email: 'john@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    department: 'Engineering'
  },
  {
    id: 'user_2', 
    name: 'Jane Smith',
    email: 'jane@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    department: 'Design'
  },
  {
    id: 'user_3',
    name: 'Mike Johnson', 
    email: 'mike@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    department: 'Product'
  },
  {
    id: 'user_4',
    name: 'Sarah Wilson',
    email: 'sarah@company.com', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    department: 'Marketing'
  },
  {
    id: 'user_5',
    name: 'David Brown',
    email: 'david@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', 
    department: 'Sales'
  }
];

const AddMembersModal = memo<AddMembersModalProps>(({ 
  open, 
  onClose, 
  teamChatId, 
  organizationId 
}) => {
  const { t } = useTranslation('chat');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { teamChats, updateTeamChat } = useTeamChatStore();
  const currentUser = useUserStore((s) => s.user);
  
  const currentChat = teamChats.find(chat => chat.id === teamChatId);
  const existingMembers = currentChat?.metadata?.teamMembers || [];
  
  // Filter out current user and already added members
  const availableMembers = mockOrgMembers.filter(member => 
    member.id !== currentUser?.id && !existingMembers.includes(member.id)
  );

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) return;
    
    setLoading(true);
    try {
      const newMembers = [...existingMembers, ...selectedMembers];
      
      await updateTeamChat(teamChatId, {
        metadata: {
          ...currentChat?.metadata,
          teamMembers: newMembers
        }
      });
      
      setSelectedMembers([]);
      onClose();
    } catch (error) {
      console.error('Failed to add members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMemberInfo = (memberId: string) => {
    return mockOrgMembers.find(member => member.id === memberId);
  };

  return (
    <Modal
      title={
        <Flexbox align="center" gap={8} horizontal>
          <UserAddOutlined style={{ color: '#1890ff' }} />
          <span>Add Team Members</span>
        </Flexbox>
      }
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button 
          key="add" 
          type="primary" 
          loading={loading}
          disabled={selectedMembers.length === 0}
          onClick={handleAddMembers}
          icon={<TeamOutlined />}
        >
          Add {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
        </Button>
      ]}
    >
      <Flexbox gap={20}>
        {/* Current Chat Info */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            CHAT DETAILS
          </Text>
          <div style={{ marginTop: '8px' }}>
            <Text strong>{currentChat?.title || 'Team AI Chat'}</Text>
            <div style={{ marginTop: '4px' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                {existingMembers.length === 0 
                  ? 'Private chat - only you can see this conversation' 
                  : `${existingMembers.length + 1} member${existingMembers.length > 0 ? 's' : ''} in this chat`
                }
              </Text>
            </div>
          </div>
        </div>

        {/* Current Members */}
        {existingMembers.length > 0 && (
          <div>
            <Text strong style={{ fontSize: '14px' }}>Current Members:</Text>
            <div style={{ marginTop: '8px' }}>
              <Space wrap>
                {/* Chat Creator */}
                <Tag color="blue" icon={<TeamOutlined />}>
                  You (Creator)
                </Tag>
                {/* Added Members */}
                {existingMembers.map(memberId => {
                  const member = getMemberInfo(memberId);
                  return member ? (
                    <Tag key={memberId} color="green">
                      <Avatar src={member.avatar} size={16} style={{ marginRight: 4 }} />
                      {member.name}
                    </Tag>
                  ) : null;
                })}
              </Space>
            </div>
          </div>
        )}

        {/* Add New Members */}
        <div>
          <Text strong style={{ fontSize: '14px' }}>Add Members:</Text>
          <Text type="secondary" style={{ display: 'block', marginTop: '4px', fontSize: '12px' }}>
            Select organization members to add to this chat
          </Text>
          
          <Select
            mode="multiple"
            style={{ width: '100%', marginTop: '12px' }}
            placeholder="Search and select members..."
            value={selectedMembers}
            onChange={setSelectedMembers}
            optionFilterProp="label"
            showSearch
          >
            {availableMembers.map(member => (
              <Option key={member.id} value={member.id} label={member.name}>
                <Flexbox align="center" gap={8} horizontal>
                  <Avatar src={member.avatar} size={24} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{member.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {member.email} • {member.department}
                    </div>
                  </div>
                </Flexbox>
              </Option>
            ))}
          </Select>
        </div>

        {/* Selected Members Preview */}
        {selectedMembers.length > 0 && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <Text strong style={{ fontSize: '13px', color: '#0369a1' }}>
              Selected Members ({selectedMembers.length}):
            </Text>
            <div style={{ marginTop: '8px' }}>
              <Space wrap>
                {selectedMembers.map(memberId => {
                  const member = getMemberInfo(memberId);
                  return member ? (
                    <Tag key={memberId} color="blue">
                      <Avatar src={member.avatar} size={16} style={{ marginRight: 4 }} />
                      {member.name}
                    </Tag>
                  ) : null;
                })}
              </Space>
            </div>
          </div>
        )}

        {/* Info Message */}
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fed7aa',
          borderRadius: '6px',
          padding: '12px'
        }}>
          <Text style={{ fontSize: '12px', color: '#92400e' }}>
            💡 <strong>Note:</strong> Added members will be able to see the entire chat history and participate in conversations with the AI assistant.
          </Text>
        </div>
      </Flexbox>
    </Modal>
  );
});

AddMembersModal.displayName = 'AddMembersModal';

export default AddMembersModal;
