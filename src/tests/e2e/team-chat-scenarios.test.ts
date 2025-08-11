import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { OptimizedWebSocketServer } from '@/server/websocket/optimized-server';
import { getOptimizedRedisService } from '@/services/optimized-redis-service-factory';
import { getSessionManager } from '@/services/sessionManagerFactory';

// Mock database
vi.mock('@/database/client/message', () => ({
  messageModel: {
    findByIds: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/database/client/teamChat', () => ({
  teamChatModel: {
    bulkCreate: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

vi.mock('@/libs/trpc/client/lambda', () => ({
  lambdaClient: {
    teamChat: {
      addMessage: {
        mutate: vi.fn().mockResolvedValue({ id: 'db-msg-id' }),
      },
    },
  },
}));

describe('Team Chat End-to-End Scenarios', () => {
  let httpServer: any;
  let wsServer: OptimizedWebSocketServer;
  let serverUrl: string;

  beforeAll(async () => {
    httpServer = createServer();
    wsServer = new OptimizedWebSocketServer(httpServer);
    await wsServer.initialize();

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address() as AddressInfo;
        serverUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await wsServer.gracefulShutdown();
    httpServer.close();
  });

  describe('Scenario 1: Team Brainstorming Session', () => {
    it('should support a 30-minute brainstorming session with AI', async () => {
      const teamId = 'brainstorm-team-1';
      const teamMembers = ['alice', 'bob', 'charlie'];
      const clients: Map<string, ClientSocket> = new Map();

      // Team members join
      for (const member of teamMembers) {
        const client = ioc(serverUrl, {
          auth: { userId: member },
          transports: ['websocket'],
        });
        clients.set(member, client);

        await new Promise(resolve => client.on('connect', resolve));
        client.emit('room:join', teamId);
      }

      // Wait for all to join
      await new Promise(resolve => setTimeout(resolve, 200));

      // Simulate conversation flow
      const conversation = [
        { user: 'alice', content: 'Let\'s brainstorm ideas for our new product feature' },
        { user: 'bob', content: 'I think we should focus on user engagement metrics' },
        { user: 'assistant', content: 'Great idea! Here are some engagement metrics to consider...' },
        { user: 'charlie', content: 'What about adding gamification elements?' },
        { user: 'alice', content: 'That could work! AI, can you suggest some gamification strategies?' },
        { user: 'assistant', content: 'Here are 5 effective gamification strategies for your product...' },
      ];

      const messagePromises: Promise<any>[] = [];
      const receivedMessages: any[] = [];

      // Set up message listeners
      clients.forEach((client, userId) => {
        client.on('message:new', (msg) => {
          receivedMessages.push({ userId, message: msg });
        });
      });

      // Send messages with realistic timing
      for (const msg of conversation) {
        const client = msg.user === 'assistant' ? 
          clients.get('alice')! : // AI responses come through a user's connection
          clients.get(msg.user)!;

        if (client) {
          client.emit('message:send', {
            teamId,
            content: msg.content,
            type: msg.user === 'assistant' ? 'assistant' : 'user',
          });
          
          // Simulate realistic typing/thinking time
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Wait for all messages to be received
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all team members received all messages
      const aliceMessages = receivedMessages.filter(r => r.userId === 'alice');
      const bobMessages = receivedMessages.filter(r => r.userId === 'bob');
      const charlieMessages = receivedMessages.filter(r => r.userId === 'charlie');

      expect(aliceMessages.length).toBeGreaterThanOrEqual(conversation.length);
      expect(bobMessages.length).toBeGreaterThanOrEqual(conversation.length);
      expect(charlieMessages.length).toBeGreaterThanOrEqual(conversation.length);

      // Check session persistence
      const sessionManager = getSessionManager();
      const sessionMessages = await sessionManager.getMessages(teamId);
      expect(sessionMessages).toBeTruthy();
      expect(sessionMessages!.length).toBeGreaterThanOrEqual(conversation.length);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Scenario 2: Late Joiner Gets Context', () => {
    it('should provide full context to team member joining mid-conversation', async () => {
      const teamId = 'late-join-team';
      const earlyBird = ioc(serverUrl, {
        auth: { userId: 'early-bird' },
        transports: ['websocket'],
      });

      await new Promise(resolve => earlyBird.on('connect', resolve));
      earlyBird.emit('room:join', teamId);

      // Early bird has conversation with AI
      const initialConversation = [
        'We need to solve the performance issue',
        'The database queries are taking too long',
        'Let me analyze the query patterns...',
        'Found it! The issue is with the N+1 queries',
      ];

      for (let i = 0; i < initialConversation.length; i++) {
        earlyBird.emit('message:send', {
          teamId,
          content: initialConversation[i],
          type: i % 2 === 0 ? 'user' : 'assistant',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Late joiner arrives
      const lateJoiner = ioc(serverUrl, {
        auth: { userId: 'late-joiner' },
        transports: ['websocket'],
      });

      const historyPromise = new Promise<any[]>((resolve) => {
        lateJoiner.on('messages:history', resolve);
      });

      await new Promise(resolve => lateJoiner.on('connect', resolve));
      lateJoiner.emit('room:join', teamId);

      // Late joiner should receive message history
      const history = await historyPromise;
      expect(history).toBeTruthy();
      expect(history.length).toBe(initialConversation.length);
      expect(history.map(m => m.content)).toEqual(initialConversation);

      // Late joiner contributes to conversation
      const newMessagePromise = new Promise((resolve) => {
        earlyBird.on('message:new', (msg) => {
          if (msg.content.includes('optimize')) resolve(msg);
        });
      });

      lateJoiner.emit('message:send', {
        teamId,
        content: 'Should we also optimize the indexes?',
        type: 'user',
      });

      const newMessage = await newMessagePromise;
      expect(newMessage).toMatchObject({
        content: 'Should we also optimize the indexes?',
        userId: 'late-joiner',
      });

      // Cleanup
      earlyBird.disconnect();
      lateJoiner.disconnect();
    });
  });

  describe('Scenario 3: High Activity with Multiple AI Interactions', () => {
    it('should handle rapid back-and-forth with AI without message loss', async () => {
      const teamId = 'high-activity-team';
      const client = ioc(serverUrl, {
        auth: { userId: 'power-user' },
        transports: ['websocket'],
      });

      await new Promise(resolve => client.on('connect', resolve));
      client.emit('room:join', teamId);

      const messageCount = 20;
      const sentMessages: string[] = [];
      const receivedMessages: any[] = [];

      client.on('message:new', (msg) => {
        receivedMessages.push(msg);
      });

      // Rapid fire Q&A session
      for (let i = 0; i < messageCount; i++) {
        const isUser = i % 2 === 0;
        const content = isUser ? 
          `Question ${i/2 + 1}: How do I implement feature ${i/2 + 1}?` :
          `Answer ${(i-1)/2 + 1}: To implement this feature, you should...`;
        
        sentMessages.push(content);
        
        client.emit('message:send', {
          teamId,
          content,
          type: isUser ? 'user' : 'assistant',
        });

        // Minimal delay to simulate rapid interaction
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for all messages to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify no message loss
      expect(receivedMessages.length).toBe(messageCount);
      expect(receivedMessages.map(m => m.content)).toEqual(sentMessages);

      // Check session has all messages
      const sessionManager = getSessionManager();
      const sessionMessages = await sessionManager.getMessages(teamId);
      expect(sessionMessages).toBeTruthy();
      expect(sessionMessages!.length).toBe(messageCount);

      client.disconnect();
    });
  });

  describe('Scenario 4: Network Interruption Recovery', () => {
    it('should recover gracefully from network interruptions', async () => {
      const teamId = 'network-recovery-team';
      const client = ioc(serverUrl, {
        auth: { userId: 'unstable-network' },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 100,
        reconnectionAttempts: 5,
      });

      await new Promise(resolve => client.on('connect', resolve));
      client.emit('room:join', teamId);

      // Send initial messages
      const messagesBeforeDisconnect = ['Message 1', 'Message 2', 'Message 3'];
      
      for (const content of messagesBeforeDisconnect) {
        client.emit('message:send', {
          teamId,
          content,
          type: 'user',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Simulate network interruption
      client.disconnect();
      
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 500));
      client.connect();

      await new Promise(resolve => client.on('connect', resolve));
      
      // Rejoin room after reconnection
      const historyPromise = new Promise<any[]>((resolve) => {
        client.on('messages:history', resolve);
      });

      client.emit('room:join', teamId);

      // Should receive message history after rejoining
      const history = await historyPromise;
      expect(history.length).toBe(messagesBeforeDisconnect.length);
      expect(history.map(m => m.content)).toEqual(messagesBeforeDisconnect);

      // Send new messages after reconnection
      const newMessage = 'Message after reconnection';
      const newMessagePromise = new Promise((resolve) => {
        client.on('message:new', (msg) => {
          if (msg.content === newMessage) resolve(msg);
        });
      });

      client.emit('message:send', {
        teamId,
        content: newMessage,
        type: 'user',
      });

      await newMessagePromise;

      // Verify session has all messages
      const sessionManager = getSessionManager();
      const allMessages = await sessionManager.getMessages(teamId);
      expect(allMessages!.length).toBe(messagesBeforeDisconnect.length + 1);

      client.disconnect();
    });
  });

  describe('Scenario 5: Concurrent Team Editing Session', () => {
    it('should handle multiple users typing simultaneously', async () => {
      const teamId = 'concurrent-typing-team';
      const users = ['editor1', 'editor2', 'editor3'];
      const clients: Map<string, ClientSocket> = new Map();
      const typingStates: Map<string, string[]> = new Map();

      // Connect all users
      for (const user of users) {
        const client = ioc(serverUrl, {
          auth: { userId: user },
          transports: ['websocket'],
        });
        clients.set(user, client);
        typingStates.set(user, []);

        await new Promise(resolve => client.on('connect', resolve));
        client.emit('room:join', teamId);

        // Track typing states
        client.on('typing:start', (data) => {
          const states = typingStates.get(user) || [];
          states.push(`${data.userId} started typing`);
          typingStates.set(user, states);
        });

        client.on('typing:stop', (data) => {
          const states = typingStates.get(user) || [];
          states.push(`${data.userId} stopped typing`);
          typingStates.set(user, states);
        });
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Simulate concurrent typing
      const typingPromises = users.map(async (user, index) => {
        const client = clients.get(user)!;
        
        // Start typing
        client.emit('typing:start', teamId);
        
        // Type for different durations
        await new Promise(resolve => setTimeout(resolve, 100 * (index + 1)));
        
        // Stop typing
        client.emit('typing:stop', teamId);
      });

      await Promise.all(typingPromises);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Each user should have seen typing indicators from others
      users.forEach((user, index) => {
        const states = typingStates.get(user) || [];
        const otherUsers = users.filter((_, i) => i !== index);
        
        otherUsers.forEach(otherUser => {
          expect(states).toContainEqual(`${otherUser} started typing`);
          expect(states).toContainEqual(`${otherUser} stopped typing`);
        });
      });

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Scenario 6: 20+ Minute Session Expiry', () => {
    it('should maintain session for active conversation over 20 minutes', async () => {
      const teamId = 'long-session-team';
      const client = ioc(serverUrl, {
        auth: { userId: 'marathon-user' },
        transports: ['websocket'],
      });

      await new Promise(resolve => client.on('connect', resolve));
      client.emit('room:join', teamId);

      const sessionManager = getSessionManager();

      // Send initial message
      client.emit('message:send', {
        teamId,
        content: 'Starting long discussion',
        type: 'user',
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate activity every few minutes (in test, we'll use shorter intervals)
      const activities = [
        { time: 1000, content: 'Still discussing...' },
        { time: 2000, content: 'Another point to consider' },
        { time: 3000, content: 'AI, what do you think?' },
        { time: 4000, content: 'Based on our discussion...' },
      ];

      for (const activity of activities) {
        await new Promise(resolve => setTimeout(resolve, activity.time));
        
        client.emit('message:send', {
          teamId,
          content: activity.content,
          type: activity.content.includes('AI') ? 'user' : 'assistant',
        });

        // Session should still be active
        const messages = await sessionManager.getMessages(teamId);
        expect(messages).toBeTruthy();
        expect(messages!.length).toBeGreaterThan(0);
      }

      // Final check - session should have all messages
      const finalMessages = await sessionManager.getMessages(teamId);
      expect(finalMessages!.length).toBe(activities.length + 1); // +1 for initial message

      client.disconnect();
    });
  });

  describe('Scenario 7: Message Read Receipts in Team', () => {
    it('should track read receipts across team members', async () => {
      const teamId = 'read-receipt-team';
      const sender = ioc(serverUrl, {
        auth: { userId: 'sender' },
        transports: ['websocket'],
      });
      const reader1 = ioc(serverUrl, {
        auth: { userId: 'reader1' },
        transports: ['websocket'],
      });
      const reader2 = ioc(serverUrl, {
        auth: { userId: 'reader2' },
        transports: ['websocket'],
      });

      // Connect all users
      await Promise.all([
        new Promise(resolve => sender.on('connect', resolve)),
        new Promise(resolve => reader1.on('connect', resolve)),
        new Promise(resolve => reader2.on('connect', resolve)),
      ]);

      // Join room
      sender.emit('room:join', teamId);
      reader1.emit('room:join', teamId);
      reader2.emit('room:join', teamId);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Track read receipts
      const readReceipts: any[] = [];
      sender.on('receipt:update', (receipt) => {
        readReceipts.push(receipt);
      });

      // Sender sends a message
      const messagePromise = new Promise<any>((resolve) => {
        reader1.on('message:new', resolve);
      });

      sender.emit('message:send', {
        teamId,
        content: 'Important announcement!',
        type: 'user',
      });

      const message = await messagePromise;

      // Readers mark message as read
      reader1.emit('receipt:update', {
        teamId,
        lastReadMessageId: message.id,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      reader2.emit('receipt:update', {
        teamId,
        lastReadMessageId: message.id,
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Sender should have received read receipts from both readers
      expect(readReceipts.length).toBe(2);
      expect(readReceipts.map(r => r.userId).sort()).toEqual(['reader1', 'reader2']);
      expect(readReceipts.every(r => r.lastReadMessageId === message.id)).toBe(true);

      // Cleanup
      sender.disconnect();
      reader1.disconnect();
      reader2.disconnect();
    });
  });

  describe('Scenario 8: Performance Under Load', () => {
    it('should maintain responsiveness with 10 team members actively chatting', async () => {
      const teamId = 'performance-team';
      const teamSize = 10;
      const clients: ClientSocket[] = [];
      const messageLatencies: number[] = [];

      // Connect team members
      for (let i = 0; i < teamSize; i++) {
        const client = ioc(serverUrl, {
          auth: { userId: `member-${i}` },
          transports: ['websocket'],
        });
        clients.push(client);

        await new Promise(resolve => client.on('connect', resolve));
        client.emit('room:join', teamId);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Each member sends messages and measures latency
      const messagePromises = clients.map((client, index) => {
        return new Promise<void>((resolve) => {
          let messagesReceived = 0;
          const expectedMessages = teamSize; // Each member sends one message

          client.on('message:new', (msg) => {
            messagesReceived++;
            if (msg.metadata && msg.metadata.sentAt) {
              const latency = Date.now() - msg.metadata.sentAt;
              messageLatencies.push(latency);
            }
            if (messagesReceived === expectedMessages) {
              resolve();
            }
          });
        });
      });

      // All members send a message simultaneously
      const sendStartTime = Date.now();
      clients.forEach((client, index) => {
        client.emit('message:send', {
          teamId,
          content: `Message from member ${index}`,
          type: 'user',
          metadata: { sentAt: Date.now() },
        });
      });

      // Wait for all messages to be received by all clients
      await Promise.race([
        Promise.all(messagePromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout waiting for messages')), 10000)
        ),
      ]);

      const totalTime = Date.now() - sendStartTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      if (messageLatencies.length > 0) {
        const avgLatency = messageLatencies.reduce((a, b) => a + b) / messageLatencies.length;
        const maxLatency = Math.max(...messageLatencies);
        
        console.log(`Performance stats: Avg latency: ${avgLatency}ms, Max latency: ${maxLatency}ms`);
        
        expect(avgLatency).toBeLessThan(200); // Average latency under 200ms
        expect(maxLatency).toBeLessThan(1000); // Max latency under 1 second
      }

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });
});
