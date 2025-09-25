'use client';

import { Modal } from 'antd';
import { memo } from 'react';

import DefaultModelsForTeamChat from './DefaultModelsForTeamChat';

interface DefaultModelsForTeamChatModalProps {
  teamChatId?: string;
  organizationId?: string;
  open: boolean;
  onClose: () => void;
}

const DefaultModelsForTeamChatModal = memo<DefaultModelsForTeamChatModalProps>(({
  teamChatId,
  organizationId,
  open,
  onClose,
}) => {
  if (!teamChatId || !organizationId) {
    return null;
  }

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ maxWidth: 1200 }}
      className="default-models-modal"
      destroyOnHidden
    >
      <DefaultModelsForTeamChat
        teamChatId={teamChatId}
        organizationId={organizationId}
        open={open}
        onClose={onClose}
      />
    </Modal>
  );
});

DefaultModelsForTeamChatModal.displayName = 'DefaultModelsForTeamChatModal';

export default DefaultModelsForTeamChatModal;
