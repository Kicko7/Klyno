# Redis Session Management Implementation

This document describes the Redis-based session management system integrated with the WebSocket server for LobeChat's team/organization chat functionality.

## 🎯 Overview

The session management system provides:

- **20-minute activity-based expiry**: Sessions automatically expire after 20 minutes of inactivity
- **1000 message limit**: Sessions maintain a rolling window of the last 1000 messages
- **Automatic synchronization**: Background worker syncs Redis sessions to PostgreSQL every 5 minutes
- **Seamless integration**: Works with both standard and optimized WebSocket servers

## 📁 Implementation Files

```
src/
├── config/
│   └── sessionConfig.ts                 # Session configuration and validation
├── services/
│   ├── sessionManager.ts               # Core session management implementation
│   └── sessionManagerFactory.ts        # Factory and background worker
├── server/
│   ├── index.ts                       # Updated standard server entry
│   ├── optimized-index.ts             # Updated optimized server entry
│   └── websocket/
│       └── optimized-server.ts        # WebSocket server with session integration
└── tests/
    └── session-management.test.ts     # Comprehensive test suite
```

## 🔧 Configuration

### Environment Variables

```env
# Required for session management
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Optional configuration (defaults shown)
SESSION_EXPIRY_SECONDS=1200           # 20 minutes
MAX_MESSAGES_PER_SESSION=1000
SESSION_SYNC_INTERVAL_SECONDS=300     # 5 minutes
```

### Configuration Validation

The system validates configuration on startup:

```typescript
if (!validateSessionConfig()) {
  console.error('Invalid session configuration. Please check your environment variables.');
  process.exit(1);
}
```

## 💡 Key Features

### 1. Activity-Based Expiry

Sessions reset their 20-minute timer whenever there's activity:
- New messages (user or AI)
- User interactions
- Any WebSocket events

```typescript
// Automatically extends session on new message
await sessionManager.addMessage(sessionId, message);

// Manually update expiry
await sessionManager.updateExpiry(sessionId);
```

### 2. Rolling Message Window

When sessions exceed 1000 messages:
- Oldest messages are removed
- Newest 1000 messages are retained
- Ensures memory efficiency

### 3. Background Synchronization

A background worker runs every 5 minutes to:
- Sync Redis sessions to PostgreSQL
- Clean up expired sessions
- Ensure data persistence

```typescript
// Started automatically with the server
startBackgroundSyncWorker();
```

### 4. WebSocket Integration

When users join a room:
- Cached messages are loaded from Redis
- Message history is sent to the client
- New messages are added to both Redis and the stream

```typescript
// In handleRoomJoin
const sessionMessages = await this.sessionManager.getMessages(roomId);
if (sessionMessages && sessionMessages.length > 0) {
  socket.emit('messages:history', sessionMessages);
}

// In handleMessageSend
await this.sessionManager.addMessage(message.teamId, {
  id: messageId,
  content: message.content,
  role: message.type || 'user',
  timestamp,
  metadata: message.metadata || {},
  userId: socket.data.userId,
});
```

## 🚀 Usage

### Starting the Server

```bash
# Standard server with session management
npm run dev:server

# Optimized server with session management
npm run dev:optimized

# Full development setup
npm run dev:optimized-full
```

### Client-Side Integration

The client receives cached messages through the `messages:history` event:

```typescript
socket.on('messages:history', (messages) => {
  // Process cached messages
  messages.forEach(msg => {
    // Add to chat UI
  });
});
```

## 🏗️ Architecture

### Data Flow

1. **User sends message** → WebSocket Server
2. **Server adds to Redis** → Session Manager
3. **Server broadcasts** → All connected clients
4. **Background worker** → Syncs to PostgreSQL
5. **On reconnect** → Load from Redis cache

### Session Structure

```typescript
interface SessionData {
  messages: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: string;
    metadata?: Record<string, any>;
    userId?: string;
  }>;
}
```

## 📊 Performance Considerations

### Memory Management
- Each session holds max 1000 messages
- Messages are stored as compressed JSON
- Expired sessions are automatically cleaned up

### Scalability
- Redis handles concurrent access
- Batch operations for efficiency
- Pipeline commands reduce round trips

### Reliability
- Graceful error handling
- Automatic retry logic
- Database sync ensures persistence

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test src/tests/session-management.test.ts
```

Tests cover:
- Configuration validation
- Message management
- Batch operations
- Session synchronization
- Error handling
- WebSocket integration

## 🎯 Use Cases

### Long Brainstorming Sessions

Perfect for extended team discussions where:
- Multiple users collaborate over 20+ minutes
- AI provides continuous assistance
- All messages are preserved in the session

### Quick Reference

Users can:
- Rejoin and see recent conversation history
- Continue discussions without context loss
- Reference earlier messages in the session

### Multi-User Collaboration

Supports scenarios where:
- Team members join at different times
- Everyone sees the same message history
- Real-time updates for all participants

## 🔍 Monitoring

The system logs key events:

```
✅ Session configuration validated
📊 Redis session management enabled
⏰ Sessions expire after 20 minutes of inactivity
💾 Max 1000 messages per session before rolling window
🔄 Background sync runs every 5 minutes
✅ Background sync worker started
📨 Sent 42 cached messages to user user-123
```

## 🚨 Error Handling

The system handles various failure scenarios:

- **Redis connection failure**: Graceful degradation
- **Sync failures**: Automatic retry with backoff
- **Malformed data**: Safe parsing with fallbacks
- **Concurrent access**: Race condition handling

## 🔐 Security Considerations

- Sessions are isolated by team/room ID
- User authentication required for access
- No cross-session data leakage
- Automatic cleanup of expired data

## 🎉 Summary

The Redis session management system enhances the team chat experience by:

1. **Preserving conversation context** for 20 minutes
2. **Enabling seamless reconnection** with message history
3. **Supporting long collaborative sessions** with AI
4. **Ensuring data persistence** through background sync
5. **Maintaining performance** with intelligent caching

This implementation provides a robust foundation for team-based AI chat interactions while maintaining the real-time responsiveness users expect.
