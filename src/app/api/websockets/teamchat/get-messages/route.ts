import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '@/database';
import { teamChatMessages, teamChats } from '@/database/schemas';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Get teamChatId parameter
    const teamChatId = searchParams.get('teamChatId');

    // Validate required parameters
    if (!teamChatId) {
      return NextResponse.json(
        { error: 'teamChatId is required' },
        { status: 400 }
      );
    }

    // Check if team chat exists
    const teamChatIdCheck = await db.query.teamChats.findFirst({
      where: eq(teamChats.id, teamChatId),
    });

    if(!teamChatIdCheck) {
      return NextResponse.json(
        { error: 'Team chat not found' },
        { status: 404 }
      );
    }

    // Get last 20 messages ordered by newest first
    const messages = await db.query.teamChatMessages.findMany({
      where: eq(teamChatMessages.teamChatId, teamChatId),
      orderBy: [desc(teamChatMessages.createdAt)], // Order by descending (newest first)
      limit: 20,
    });

    // Return last 20 messages
    return NextResponse.json(messages);

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}