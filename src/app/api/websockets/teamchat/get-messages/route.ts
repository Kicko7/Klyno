import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '@/database';
import { teamChatMessages } from '@/database/schemas';
import type { TeamChatMessageItem } from '@/database/schemas/teamChat';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Get query parameters
    const teamChatId = searchParams.get('teamChatId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    const lastMessageId = searchParams.get('lastMessageId');

    // Validate required parameters
    if (!teamChatId) {
      return NextResponse.json(
        { error: 'teamChatId is required' },
        { status: 400 }
      );
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    const conditions = [eq(teamChatMessages.teamChatId, teamChatId)];

    // If lastMessageId is provided, get messages after that ID
    if (lastMessageId) {
      const lastMessage = await db.query.teamChatMessages.findFirst({
        where: eq(teamChatMessages.id, lastMessageId),
      });

      if (lastMessage) {
        conditions.push(sql`${teamChatMessages.createdAt} > ${lastMessage.createdAt}`);
      }
    }

    // Get messages
    const messages = await db.query.teamChatMessages.findMany({
      where: and(...conditions),
      orderBy: [desc(teamChatMessages.createdAt)], // Order by descending (newest first) for chat display
      limit,
      offset,
    });

    // Return messages with metadata
    return NextResponse.json(messages);

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}