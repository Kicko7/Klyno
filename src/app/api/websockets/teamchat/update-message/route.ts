import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/database';
import { teamChatMessages } from '@/database/schemas';

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing required field: message ID' },
        { status: 400 },
      );
    }

    // Check if message exists
    const existingMessage = await db.query.teamChatMessages.findFirst({
      where: eq(teamChatMessages.id, messageId),
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 },
      );
    }

    const body = await req.json();

    const updatedMessage = await db
      .update(teamChatMessages)
      .set({
        content: body.content,
        updatedAt: new Date(),
      })
      .where(eq(teamChatMessages.id, messageId))
      .returning();

    return NextResponse.json({ 
      success: true, 
      message: 'Message updated successfully',
      updatedMessage
    });

  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
