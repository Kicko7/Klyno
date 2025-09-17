import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/database';
import { teamChatMessages, users } from '@/database/schemas';
import { idGenerator } from '@/database/utils/idGenerator';

export async function POST(req: NextRequest) {
  const data = await req.json();
  console.log('data', data)
  try {
    const { teamChatId, userId, ...messageData } = data;

    if (!data.teamChatId || !data.content || !data.messageType) {
      return NextResponse.json(
        { error: 'Missing required fields: teamChatId, userId, content, or messageType' },
        { status: 400 },
      );
    }

    const messageId = data.id || idGenerator('team_chat_messages');

    const user = await db.query.users.findFirst({
      where: eq(users.id, messageData.metadata.userId || data.userId),
    });

    const messageMetadata = {
      ...(data.metadata || {}),
      userInfo: {
        id: userId,
        username: user?.username ?? user?.email ?? 'assistant',
        email: user?.email ?? 'assistant',
        fullName:
          (user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`
            : user?.firstName || user?.lastName) ?? 'assistant',
            avatar: user?.avatar ?? '',
      },
      isMultiUserChat: true,
    };

    // Check if message already exists and update it
    if (data.id) {
      const existingMessage = await db.query.teamChatMessages.findFirst({
        where: eq(teamChatMessages.id, data.id),
      });

      if (existingMessage) {
        const result = await db
          .update(teamChatMessages)
          .set({
            content: messageData.content,
            messageType: messageData.messageType,
            metadata: messageMetadata,
            updatedAt: new Date(),
            createdAt: messageData.originalTimestamp
          })
          .where(eq(teamChatMessages.id, data.id))
          .returning();

        return NextResponse.json(result[0]);
      }
    }
    // Create new message
    const result = await db
      .insert(teamChatMessages)
      .values({
        content: messageData.content,
        messageType: messageData.messageType,
        metadata: messageMetadata,
        teamChatId,
        userId: messageData?.metadata?.userId || data?.userId || '',
        id: messageId,
        createdAt: new Date(messageData.metadata.originalTimestamp),
        updatedAt: new Date(messageData.metadata.originalTimestamp),
        sendTime: new Date(messageData.metadata.originalTimestamp),
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}