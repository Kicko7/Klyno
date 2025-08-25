import { nanoid } from 'nanoid';


import { ApiService } from './fetchService';
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
  private apiService: ApiService;
  private readonly SESSION_TTL = 12000; // 20 minutes in seconds
  private readonly MAX_MESSAGES = 1000;
  private readonly INITIAL_LOAD_SIZE = 50;

  constructor(redisService: OptimizedRedisService, syncService: SyncService) {
    this.redisService = redisService;
    this.syncService = syncService;
    this.apiService = new ApiService(); // Create instance in constructor
  }

  /**
   * Create a new chat session in Redis
   */
  async createSession(teamChatId: string, participants: string[] = []): Promise<ChatSession> {
    const now = Date.now();
    const session: any = {
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
  async getSession(teamChatId: string): Promise<ChatSession | any> {
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
  async loadSessionFromDb(teamChatId: string): Promise<ChatSession | any> {
    try {
      console.log(`📥 Loading session from DB for team chat: ${teamChatId}`);

      // Load recent messages from database
      const messages = await this.apiService.getMessages(teamChatId, this.INITIAL_LOAD_SIZE);

      if (!messages || messages.length === 0) {
        return null;
      }

      // Convert DB messages to session format
      const messageData: MessageData[] = messages.map((msg:any) => ({
        id: msg.id,
        content: msg.content,
        userId: msg.userId,
        timestamp: msg.createdAt,
        type: msg.messageType as 'user' | 'assistant' | 'system',
        metadata: msg.metadata,
        syncedToDb: true, // These are already in DB
      }));

      // Get unique participants
      const participants = [...new Set(messages.map((m:any) => m.userId))];

      // Create session with loaded messages
      const now = Date.now();
      const session: any = {
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
   * Add a message to an existing session
   */
  async appendMessage(teamChatId: string, message: MessageData): Promise<void> {
    try {
   

      // Check if session exists in Redis
      let session = await this.getSession(teamChatId);

      // If session doesn't exist, try to load from database first
      if (!session) {
        session = await this.loadSessionFromDb(teamChatId);
        if (!session) {
          // Create new session if none exists
          session = await this.createSession(teamChatId);
        }
      }

      const existingMessageIndex = session.messages.findIndex((m:any) => m.id === message.id);
      if (existingMessageIndex !== -1) {
        // Update existing message instead of adding duplicate
        session.messages[existingMessageIndex] = {
          ...session.messages[existingMessageIndex],
          content: message.content,
          metadata: { ...session.messages[existingMessageIndex].metadata, ...message.metadata },
          timestamp: message.timestamp,
        };
      } else {
        // Add new message to session
        session.messages.push(message);
      }

      // Update session with new message
      const updatedSession: any = {
        ...session,
        messages: session.messages,
        lastActivityAt: Date.now(),
        expiresAt: Date.now() + this.SESSION_TTL * 1000,
      };

      // Save to Redis
      await this.redisService.setSession(updatedSession);

    } catch (error) {
      console.error(`❌ Failed to add message to session: ${teamChatId}`, error);
      throw error;
    }
  }

  /**
   * Persist a message to the database
   */
  // private async persistMessageToDatabase(teamChatId: string, message: MessageData): Promise<void> {
  //   console.log('Persisting message to database', message);
  //   try {
  //     await this.apiService.addMessage({
  //       teamChatId,
  //       userId: message.userId,
  //       content: message.content,
  //       messageType: message.type as 'user' | 'assistant' | 'system',
  //       metadata: {
  //         ...message.metadata,
  //         redisMessageId: message.id,
  //         syncedFromRedis: true,
  //       },
  //     });
  //   } catch (error) {
  //     console.error(`Failed to persist message to database: ${message.id}`, error);
  //     throw error;
  //   }
  // }

  /**
   * Update session with multiple messages (batch operation)
   */
    async updateSession(teamChatId: string, messages: any[]): Promise<void> {
    let session = await this.getSession(teamChatId);

    if (!session) {
      const participants = [...new Set(messages.map((m:any) => m.userId))];
      session = await this.createSession(teamChatId, participants);
    }

    // Handle message limit
    const totalMessages = session.messages.length + messages.length;
    if (totalMessages > this.MAX_MESSAGES) {
      const toRemove = totalMessages - this.MAX_MESSAGES;
      const removedMessages = session.messages.splice(0, toRemove);

      // Sync removed messages to DB
      const unsyncedMessages = removedMessages.filter((m:any) => !m.syncedToDb);
      if (unsyncedMessages.length > 0) {
        await this.syncService.batchSyncMessages(teamChatId, unsyncedMessages);
      }
    }

    // Add new messages
    session.messages.push(...messages);

    // Update participants
    const newParticipants = [...new Set(messages.map((m:any) => m.userId))];
    newParticipants.forEach((userId:any) => {
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
  async getExpiringSessions(): Promise<any[]> {
    try {
      const allSessions = await this.redisService.getAllActiveSessions();
      const now = Date.now();
      const expiryThreshold = now + 60000; // Sessions expiring in next minute

      return (allSessions as any[]).filter(
        (session: any) =>
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
  async getAllActiveSessions(): Promise<any[]> {
    try {
      const sessions:any = await this.redisService.getAllActiveSessions();
      return (sessions || []) as any[];
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
      const unsyncedMessages = session.messages.filter((m:any) => !m.syncedToDb);
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
      unsyncedCount: session.messages.filter((m:any) => !m.syncedToDb).length,
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
    const messagesToSync = session.messages.slice(0, halfIndex).filter((m:any) => !m.syncedToDb);

    if (messagesToSync.length > 0) {
      await this.syncService.batchSyncMessages(teamChatId, messagesToSync);

      // Mark as synced in session
      session.messages.forEach((msg:any, index:any) => {
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

  async getSessionByMessageId(messageId: string): Promise<any> {
    try {
      // Get all active sessions from Redis
      const sessions = await this.redisService.getAllActiveSessions();
      
      console.log('sessions', sessions);
      for (const session of sessions) {
        const message = session.messages?.find((msg: any) => msg.id === messageId);
        if (message) {
          return session;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding session by message ID:', error);
      return null;
    }
  }

  /**
   * Update message in session
   */
  async updateMessage(sessionId: string, messageId: string, updates: any): Promise<boolean> {
    try {
      const session = await this.getSessionByMessageId(messageId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Find and update the message
      const messageIndex = session.messages.findIndex((msg: any) => msg.id === messageId);
      if (messageIndex === -1) {
        throw new Error(`Message ${messageId} not found in session ${sessionId}`);
      }

      // Update the message
      session.messages[messageIndex] = {
        ...session.messages[messageIndex],
        ...updates,
      };

      // Save updated session back to Redis
      await this.redisService.setSession(session);
      
      console.log(`✅ Message ${messageId} updated in session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error updating message in session:', error);
      return false;
    }
  }

  /**
   * Delete message from session
   */
  async deleteMessage(sessionId: string, messageId: string): Promise<boolean> {
    try {
      const session = await this.getSessionByMessageId(messageId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Find and remove the message
      const messageIndex = session.messages.findIndex((msg: any) => msg.id === messageId);
      if (messageIndex === -1) {
        throw new Error(`Message ${messageId} not found in session ${sessionId}`);
      }

      // Remove the message
      session.messages.splice(messageIndex, 1);

      // Save updated session back to Redis
      await this.redisService.setSession(session);
      
      console.log(`✅ Message ${messageId} deleted from session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error deleting message from session:', error);
      return false;
    }
  }

}
