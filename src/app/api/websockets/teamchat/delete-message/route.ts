import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/database';
import { teamChatMessages } from '@/database/schemas';

export async function DELETE(req: NextRequest) {
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
        {
          success: true,
          message: "Message already deleted"
        }
      );
    }

    await db
      .delete(teamChatMessages)
      .where(eq(teamChatMessages.id, messageId));

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
