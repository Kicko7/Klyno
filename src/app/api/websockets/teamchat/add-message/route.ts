import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/database';
import { users, teamChatMessages } from '@/database/schemas';
import { idGenerator } from '@/database/utils/idGenerator';

export async function POST(req: NextRequest) {
  const data = await req.json();
  try {
    console.log('data', data);
    const { teamChatId, userId, ...messageData } = data;

    if (!data.teamChatId || !data.content || !data.messageType) {
      return NextResponse.json(
        { error: 'Missing required fields: teamChatId, userId, content, or messageType' },
        { status: 400 }
      );
    }

    const messageId = data.id || idGenerator('team_chat_messages');

    const user = await db.query.users.findFirst({
      where: eq(users.id, messageData.metadata.userId || data.userId),
    });

    // Prepare metadata with user information
    const messageMetadata = {
      ...(data.metadata || {}),
      userInfo: {
        id: userId,
        username: user?.username ?? 'assistant',
        email: user?.email ?? 'assistant',
        fullName: user?.fullName ?? 'assistant',
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
          })
          .where(eq(teamChatMessages.id, data.id))
          .returning();

        return NextResponse.json(result[0]);
      }
    }

    console.log("Checking User",{
      content: messageData.content,
      messageType: messageData.messageType,
      metadata: messageMetadata,
      teamChatId,
      userId: messageData?.metadata?.userId || data?.userId || '',
      id: messageId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(result[0]);

  } catch (error) {
    console.error('Error adding message:', error);
    console.log({
      error: error,
      content: data.content,
      messageType: data.messageType,
      metadata: data.metadata,
      teamChatId:data.teamChatId,
      userId: data.userId ,
      id: data.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}