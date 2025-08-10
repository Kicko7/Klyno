import { useCallback, useEffect, useState } from 'react';

import { ReadReceiptData } from '@/types/redis';
import { Socket } from '@/types/socket';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';

export const useReadReceipts = (socket: Socket | undefined, teamId: string) => {
  const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceiptData>>({});

  // Handle read receipt updates
  useEffect(() => {
    if (!socket || !teamId) return;

    const handleReadReceiptList = (data: Record<string, ReadReceiptData>) => {
      setReadReceipts(data);
    };

    const handleReadReceiptUpdate = (data: ReadReceiptData) => {
      setReadReceipts((prev) => ({
        ...prev,
        [data.userId]: data,
      }));
    };

    socket.on('receipt:list', handleReadReceiptList);
    socket.on('receipt:update', handleReadReceiptUpdate);

    return () => {
      socket.off('receipt:list', handleReadReceiptList);
      socket.off('receipt:update', handleReadReceiptUpdate);
    };
  }, [socket, teamId]);

  // Update read receipt
  const updateReadReceipt = useCallback(
    (messageId: string) => {
      if (!socket || !teamId) return;
      socket.emit('receipt:update', {
        userId: socket.handshake.auth.userId,
        lastReadMessageId: messageId,
      });
    },
    [socket, teamId],
  );

  // Get last read message ID for a user
  const getLastReadMessageId = useCallback(
    (userId: string) => {
      return readReceipts[userId]?.lastReadMessageId;
    },
    [readReceipts],
  );

  // Check if a message has been read by a user
  const isMessageRead = useCallback(
    (messageId: string, userId: string) => {
      const lastReadId = readReceipts[userId]?.lastReadMessageId;
      if (!lastReadId) return false;

      // Compare message timestamps to determine if read
      const lastReadTimestamp = new Date(readReceipts[userId].timestamp).getTime();
      const messageTimestamp = parseInt(messageId.split('_')[1], 10);
      return messageTimestamp <= lastReadTimestamp;
    },
    [readReceipts],
  );

  // Get all users who have read a message
  const getMessageReaders = useCallback(
    (messageId: string) => {
      return Object.entries(readReceipts)
        .filter(([_, receipt]) => {
          const lastReadTimestamp = new Date(receipt.timestamp).getTime();
          const messageTimestamp = parseInt(messageId.split('_')[1], 10);
          return messageTimestamp <= lastReadTimestamp;
        })
        .map(([userId]) => userId);
    },
    [readReceipts],
  );

  return {
    readReceipts,
    updateReadReceipt,
    getLastReadMessageId,
    isMessageRead,
    getMessageReaders,
  };
};
