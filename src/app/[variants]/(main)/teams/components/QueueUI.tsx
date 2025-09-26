import { Trash2, Users } from 'lucide-react';
import React, { memo, useCallback } from 'react';

import { useTeamChatStore } from '@/store/teamChat';

const QueueUI: React.FC = memo(() => {
  const { 
    queueItems, 
    showQueue, 
    removeFromQueue, 
    clearQueue, 
    removeQueueFromWebSocket 
  } = useTeamChatStore();

  const handleRemoveFromQueue = useCallback(async (item: any) => {
    try {
      console.log('Removing queue message:', item.messageId, 'from team:', item.teamId);
      // First, send WebSocket event to remove from server
      removeQueueFromWebSocket(item.teamId, item.messageId);
      // Then update local state
      removeFromQueue(item.messageId);
      console.log('Queue message removed successfully');
    } catch (error) {
      console.error('Error removing message from queue:', error);
    }
  }, [removeFromQueue, removeQueueFromWebSocket]);

  if (queueItems.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${queueItems.length === 1 ? 'flex justify-center' : ''}`}>
      <div
        className={`${
          queueItems.length === 1
            ? 'w-[90%] sm:w-[70%] md:w-[50%] lg:w-[40%] xl:w-[30%]'
            : 'w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4'
        }`}
      >
        {queueItems.map((item, index) => (
          <div
            key={item.messageId}
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Header with Queue Number and Trash Button */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Queue {index + 1}</span>
              </div>
              <button
                onClick={() => handleRemoveFromQueue(item)}
                className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} color="red" />
              </button>
            </div>

            {/* Queue Item Content */}
            <div>
              <div className="text-sm font-medium text-gray-900 mb-2">
                {item.metadata?.userInfo?.fullName ||
                  item.metadata.userInfo?.username ||
                  item.metadata.userInfo?.email}
              </div>
              <div className="text-sm text-gray-600 line-clamp-3" title={item.content}>
                {item.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

QueueUI.displayName = 'QueueUI';

export default QueueUI;
