import { nanoid } from 'nanoid';

import { TeamChatMessageItem } from '@/database/schemas/teamChat';
import { lambdaClient } from '@/libs/trpc/client';

import { OptimizedRedisService } from './optimized-redis-service';
import { SyncService } from './syncService';

export interface ChatSession {
  sessionId: string;
  teamChatId: string;
  participants: string[];
  messages: MessageData[];
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  status: 'active' | 'syncing' | 'expired';
}

export interface MessageData {
  id: string;
  content: string;
  userId: string;
  timestamp: number;
  type: 'user' | 'assistant' | 'system';
  metadata?: any;
  syncedToDb?: boolean;
}

export class SessionManager {
  private redisService: OptimizedRedisService;
  private syncService: SyncService;
  private readonly SESSION_TTL = 1200; // 20 minutes in seconds
  private readonly MAX_MESSAGES = 1000;
  private readonly INITIAL_LOAD_SIZE = 50;

  constructor(redisService: OptimizedRedisService, syncService: SyncService) {
    this.redisService = redisService;
    this.syncService = syncService;
  }

  /**
   * Create a new chat session in Redis
   */
  async createSession(teamChatId: string, participants: string[] = []): Promise<ChatSession> {
    const now = Date.now();
    const session: ChatSession = {
      sessionId: `session_${teamChatId}_${nanoid()}`,
      teamChatId,
      participants,
      messages: [],
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + this.SESSION_TTL * 1000,
      status: 'active',
    };

    await this.redisService.setSession(session);
    console.log(`✅ Created new session for team chat: ${teamChatId}`);
    return session;
  }

  /**
   * Get an existing session from Redis
   */
  async getSession(teamChatId: string): Promise<ChatSession | null> {
    try {
      const session = await this.redisService.getSession(teamChatId);
      if (session && session.status === 'active') {
        return session;
      }
      return null;
    } catch (error) {
      console.error(`Error getting session for ${teamChatId}:`, error);
      return null;
    }
  }

  /**
   * Load session from database if not in Redis
   */
  async loadSessionFromDb(teamChatId: string): Promise<ChatSession | null> {
    try {
      console.log(`📥 Loading session from DB for team chat: ${teamChatId}`);

      // Load recent messages from database
      const messages = await lambdaClient.teamChat.getMessages.query({
        teamChatId,
        limit: this.INITIAL_LOAD_SIZE,
      });

      if (!messages || messages.length === 0) {
        return null;
      }

      // Convert DB messages to session format
      const messageData: MessageData[] = messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        userId: msg.userId,
        timestamp: msg.createdAt.getTime(),
        type: msg.messageType as 'user' | 'assistant' | 'system',
        metadata: msg.metadata,
        syncedToDb: true, // These are already in DB
      }));

      // Get unique participants
      const participants = [...new Set(messages.map((m) => m.userId))];

      // Create session with loaded messages
      const now = Date.now();
      const session: ChatSession = {
        sessionId: `session_${teamChatId}_${nanoid()}`,
        teamChatId,
        participants,
        messages: messageData.reverse(), // Reverse to get chronological order
        createdAt: now,
        lastActivityAt: now,
        expiresAt: now + this.SESSION_TTL * 1000,
        status: 'active',
      };

      // Cache in Redis
      await this.redisService.setSession(session);
      console.log(`✅ Loaded ${messages.length} messages from DB for team chat: ${teamChatId}`);

      return session;
    } catch (error) {
      console.error(`Error loading session from DB for ${teamChatId}:`, error);
      return null;
    }
  }

  /**
   * Add a message to the session
   */
  async appendMessage(teamChatId: string, message: MessageData): Promise<void> {
    let session = await this.getSession(teamChatId);

    if (!session) {
      // Create new session if doesn't exist
      session = await this.createSession(teamChatId, [message.userId]);
    }

    // Check if we're at message limit
    if (session.messages.length >= this.MAX_MESSAGES) {
      // Remove oldest message and ensure it's saved to DB
      const oldestMessage = session.messages.shift();
      if (oldestMessage && !oldestMessage.syncedToDb) {
        await this.syncService.syncSingleMessage(teamChatId, oldestMessage);
      }
    }

    // Add new message
    session.messages.push({
      ...message,
      syncedToDb: false,
    });

    // Update participants if new user
    if (!session.participants.includes(message.userId)) {
      session.participants.push(message.userId);
    }

    // Update timestamps
    const now = Date.now();
    session.lastActivityAt = now;
    session.expiresAt = now + this.SESSION_TTL * 1000;

    // Save updated session
    await this.redisService.setSession(session);

    console.log(`📝 Added message to session: ${teamChatId} (${session.messages.length} messages)`);
  }

  /**
   * Update session with multiple messages (batch operation)
   */
  async updateSession(teamChatId: string, messages: MessageData[]): Promise<void> {
    let session = await this.getSession(teamChatId);

    if (!session) {
      const participants = [...new Set(messages.map((m) => m.userId))];
      session = await this.createSession(teamChatId, participants);
    }

    // Handle message limit
    const totalMessages = session.messages.length + messages.length;
    if (totalMessages > this.MAX_MESSAGES) {
      const toRemove = totalMessages - this.MAX_MESSAGES;
      const removedMessages = session.messages.splice(0, toRemove);

      // Sync removed messages to DB
      const unsyncedMessages = removedMessages.filter((m) => !m.syncedToDb);
      if (unsyncedMessages.length > 0) {
        await this.syncService.batchSyncMessages(teamChatId, unsyncedMessages);
      }
    }

    // Add new messages
    session.messages.push(...messages);

    // Update participants
    const newParticipants = [...new Set(messages.map((m) => m.userId))];
    newParticipants.forEach((userId) => {
      if (!session.participants.includes(userId)) {
        session.participants.push(userId);
      }
    });

    // Update timestamps
    const now = Date.now();
    session.lastActivityAt = now;
    session.expiresAt = now + this.SESSION_TTL * 1000;

    // Save updated session
    await this.redisService.setSession(session);
  }

  /**
   * Refresh session expiry time (called on activity)
   */
  async refreshSession(teamChatId: string): Promise<void> {
    const session = await this.getSession(teamChatId);
    if (!session) return;

    const now = Date.now();
    session.lastActivityAt = now;
    session.expiresAt = now + this.SESSION_TTL * 1000;

    await this.redisService.setSession(session);
    await this.redisService.refreshExpiry(teamChatId, this.SESSION_TTL);
  }

  /**
   * Get sessions that are about to expire (for background sync)
   */
  async getExpiringSessions(): Promise<ChatSession[]> {
    try {
      const allSessions = await this.redisService.getAllActiveSessions();
      const now = Date.now();
      const expiryThreshold = now + 60000; // Sessions expiring in next minute

      return (allSessions as ChatSession[]).filter(
        (session: ChatSession) =>
          session.status === 'active' &&
          session.expiresAt <= expiryThreshold &&
          session.messages.some((m: MessageData) => !m.syncedToDb), // Only if has unsynced messages
      );
    } catch (error) {
      console.error('Error getting expiring sessions:', error);
      return [];
    }
  }

  /**
   * Get all active sessions currently stored in Redis
   */
  async getAllActiveSessions(): Promise<ChatSession[]> {
    try {
      const sessions = await this.redisService.getAllActiveSessions();
      return (sessions || []) as ChatSession[];
    } catch (error) {
      console.error('Error getting all active sessions:', error);
      return [];
    }
  }

  /**
   * Mark session as syncing
   */
  async markSessionSyncing(teamChatId: string): Promise<void> {
    const session = await this.getSession(teamChatId);
    if (!session) return;

    session.status = 'syncing';
    await this.redisService.setSession(session);
  }

  /**
   * Expire a session (remove from Redis after sync)
   */
  async expireSession(teamChatId: string): Promise<void> {
    try {
      const session = await this.getSession(teamChatId);
      if (!session) return;

      // Ensure all messages are synced
      const unsyncedMessages = session.messages.filter((m) => !m.syncedToDb);
      if (unsyncedMessages.length > 0) {
        await this.syncService.syncSessionToDb(session);
      }

      // Remove from Redis
      await this.redisService.deleteSession(teamChatId);
      console.log(`🗑️ Expired session for team chat: ${teamChatId}`);
    } catch (error) {
      console.error(`Error expiring session for ${teamChatId}:`, error);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(teamChatId: string): Promise<{
    messageCount: number;
    participantCount: number;
    duration: number;
    unsyncedCount: number;
  } | null> {
    const session = await this.getSession(teamChatId);
    if (!session) return null;

    const now = Date.now();
    return {
      messageCount: session.messages.length,
      participantCount: session.participants.length,
      duration: now - session.createdAt,
      unsyncedCount: session.messages.filter((m) => !m.syncedToDb).length,
    };
  }

  /**
   * Check if session needs background sync (approaching message limit)
   */
  async needsBackgroundSync(teamChatId: string): Promise<boolean> {
    const session = await this.getSession(teamChatId);
    if (!session) return false;

    const syncThreshold = Math.floor(this.MAX_MESSAGES * 0.8); // 80% of limit
    return session.messages.length >= syncThreshold;
  }

  /**
   * Perform background sync for active session
   */
  async performBackgroundSync(teamChatId: string): Promise<void> {
    const session = await this.getSession(teamChatId);
    if (!session || session.status !== 'active') return;

    // Sync older half of messages
    const halfIndex = Math.floor(session.messages.length / 2);
    const messagesToSync = session.messages.slice(0, halfIndex).filter((m) => !m.syncedToDb);

    if (messagesToSync.length > 0) {
      await this.syncService.batchSyncMessages(teamChatId, messagesToSync);

      // Mark as synced in session
      session.messages.forEach((msg, index) => {
        if (index < halfIndex) {
          msg.syncedToDb = true;
        }
      });

      await this.redisService.setSession(session);
      console.log(
        `🔄 Background sync completed for ${teamChatId}: ${messagesToSync.length} messages`,
      );
    }
  }
}
