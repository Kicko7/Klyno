# Optimized WebSocket and Redis Implementation

This document describes the optimized WebSocket and Redis implementation for LobeChat's team/organization chat functionality, providing enhanced performance, reliability, and scalability.

## 🚀 Overview

The optimized implementation replaces the existing WebSocket and Redis services with enhanced versions that provide:

- **Improved Performance**: Batch operations, connection pooling, and optimized data structures
- **Enhanced Reliability**: Comprehensive error handling, automatic reconnection, and health monitoring
- **Better Scalability**: Rate limiting, memory management, and efficient resource utilization
- **Real-time Features**: Team presence tracking, typing indicators, read receipts, and message streaming

## 📁 File Structure

```
src/
├── server/
│   ├── optimized-index.ts              # Optimized server entry point
│   └── websocket/
│       └── optimized-server.ts         # Enhanced WebSocket server
├── services/
│   ├── optimized-redis-service.ts      # Optimized Redis service
│   ├── optimized-redis-service-factory.ts # Redis service factory
│   └── optimized-sync-service.ts       # Batch synchronization service
├── hooks/
│   └── useOptimizedTeamChatWebSocket.ts # React hook for WebSocket integration
└── tests/
    └── optimized-websocket-redis.test.ts # Comprehensive test suite
```

## 🔧 Architecture

### WebSocket Server (`OptimizedWebSocketServer`)

The optimized WebSocket server provides:

- **Connection Management**: Automatic cleanup, heartbeat monitoring, and connection metrics
- **Rate Limiting**: Configurable rate limits for different operations
- **Event Handling**: Organized event handlers with error boundaries
- **Memory Management**: Automatic cleanup of inactive connections
- **Graceful Shutdown**: Proper cleanup on server shutdown

#### Key Features:

```typescript
// Rate limiting configuration
const RATE_LIMITS = {
  MESSAGE_SEND: { points: 10, duration: 60 }, // 10 messages per minute
  TYPING_EVENTS: { points: 30, duration: 60 }, // 30 typing events per minute
  ROOM_JOIN: { points: 5, duration: 60 }, // 5 room joins per minute
  PRESENCE_UPDATE: { points: 20, duration: 60 }, // 20 presence updates per minute
};

// Connection management
const CONNECTION_CONFIG = {
  MAX_ROOMS_PER_USER: 10,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 60000, // 60 seconds
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
};
```

### Redis Service (`OptimizedRedisService`)

The optimized Redis service provides:

- **Connection Health Monitoring**: Automatic health checks and reconnection
- **Batch Operations**: Efficient batch processing for multiple operations
- **Retry Logic**: Automatic retry with exponential backoff
- **Data Validation**: Schema validation for all data operations
- **Memory Optimization**: Automatic memory cleanup and optimization

#### Key Features:

```typescript
// Health monitoring
interface ConnectionHealth {
  isConnected: boolean;
  lastPing: number;
  errorCount: number;
  reconnectAttempts: number;
}

// Batch operations
interface BatchOperation {
  type: 'set' | 'del' | 'expire';
  key: string;
  value?: any;
  ttl?: number;
}
```

### Sync Service (`OptimizedSyncService`)

The optimized sync service provides:

- **Batch Synchronization**: Efficient batch processing between Redis and PostgreSQL
- **Conflict Resolution**: Handles data conflicts and duplicates
- **Error Recovery**: Automatic retry and error handling
- **Performance Monitoring**: Metrics and monitoring for sync operations

## 🚀 Getting Started

### 1. Start the Optimized Server

```bash
# Start the optimized WebSocket server
npm run dev:optimized

# Or use the optimized server directly
node src/server/optimized-index.ts
```

### 2. Use the Optimized Hook

```typescript
import { useOptimizedTeamChatWebSocket } from '@/hooks/useOptimizedTeamChatWebSocket';

const TeamChatComponent = ({ teamChatId }: { teamChatId: string }) => {
  const {
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    updateReadReceipt,
  } = useOptimizedTeamChatWebSocket({
    teamChatId,
    enabled: true,
  });

  const handleSendMessage = (content: string) => {
    sendMessage(content, 'user', {
      timestamp: new Date().toISOString(),
      metadata: { /* additional data */ },
    });
  };

  return (
    <div>
      <div>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Your chat UI components */}
    </div>
  );
};
```

### 3. Configure Environment Variables

```env
# WebSocket server configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
PORT=3001

# Redis configuration
REDIS_URL=your-redis-url
REDIS_TOKEN=your-redis-token

# Optional: Custom rate limits
WEBSOCKET_RATE_LIMIT_MESSAGE_SEND=10
WEBSOCKET_RATE_LIMIT_TYPING_EVENTS=30
```

## 📊 Performance Optimizations

### 1. Connection Pooling

- Efficient connection management with automatic cleanup
- Connection metrics tracking for monitoring
- Heartbeat monitoring to detect stale connections

### 2. Batch Operations

- Redis operations are batched for better performance
- Database operations use transactions for consistency
- Configurable batch sizes and intervals

### 3. Memory Management

- Automatic cleanup of inactive connections
- Memory optimization for Redis operations
- Efficient data structures and serialization

### 4. Rate Limiting

- Configurable rate limits for different operations
- Automatic blocking of excessive requests
- Graceful degradation under load

## 🔒 Security Features

### 1. Authentication

- User authentication required for all connections
- Token-based authentication with Redis
- Automatic session management

### 2. Rate Limiting

- Per-user rate limiting for all operations
- Automatic blocking of abusive users
- Configurable limits and durations

### 3. Input Validation

- Schema validation for all incoming data
- Size limits for messages and metadata
- Sanitization of user inputs

## 🧪 Testing

### Running Tests

```bash
# Run all optimized tests
npm test optimized-websocket-redis

# Run specific test suites
npm test -- --grep "WebSocket Server"
npm test -- --grep "Redis Service"
npm test -- --grep "Performance"
```

### Test Coverage

The test suite covers:

- **WebSocket Server**: Connection management, event handling, rate limiting
- **Redis Service**: Data operations, health monitoring, batch processing
- **Sync Service**: Batch synchronization, error handling, performance
- **Error Handling**: Connection failures, rate limiting, data validation
- **Performance**: Concurrent connections, batch processing, memory usage

## 📈 Monitoring and Metrics

### WebSocket Metrics

```typescript
const stats = wsServer.getConnectionStats();
console.log({
  totalConnections: stats.totalConnections,
  activeConnections: stats.activeConnections,
  totalRooms: stats.totalRooms,
  totalMessages: stats.totalMessages,
  uptime: stats.uptime,
});
```

### Redis Health

```typescript
const health = redisService.getHealth();
console.log({
  isConnected: health.isConnected,
  lastPing: health.lastPing,
  errorCount: health.errorCount,
  reconnectAttempts: health.reconnectAttempts,
});
```

### Sync Metrics

```typescript
const metrics = syncService.getSyncMetrics();
console.log({
  totalSynced: metrics.totalSynced,
  failedSyncs: metrics.failedSyncs,
  lastSyncTime: metrics.lastSyncTime,
  syncDuration: metrics.syncDuration,
  errors: metrics.errors,
});
```

## 🔧 Configuration

### WebSocket Server Configuration

```typescript
// Customize rate limits
const customRateLimits = {
  MESSAGE_SEND: { points: 20, duration: 60 }, // 20 messages per minute
  TYPING_EVENTS: { points: 50, duration: 60 }, // 50 typing events per minute
  ROOM_JOIN: { points: 10, duration: 60 }, // 10 room joins per minute
  PRESENCE_UPDATE: { points: 30, duration: 60 }, // 30 presence updates per minute
};

// Customize connection settings
const customConnectionConfig = {
  MAX_ROOMS_PER_USER: 20,
  HEARTBEAT_INTERVAL: 15000, // 15 seconds
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  MAX_MESSAGE_SIZE: 2 * 1024 * 1024, // 2MB
};
```

### Redis Service Configuration

```typescript
// Customize batch settings
const batchConfig = {
  batchSize: 100,
  batchInterval: 200, // ms
  retryAttempts: 5,
  retryDelay: 2000, // ms
};
```

### Sync Service Configuration

```typescript
// Customize sync settings
const syncConfig = {
  batchSize: 200,
  syncInterval: 60000, // 60 seconds
  maxRetries: 5,
  retryDelay: 2000, // ms
};
```

## 🚨 Error Handling

### Common Error Scenarios

1. **Redis Connection Failure**
   - Automatic reconnection with exponential backoff
   - Fallback to local storage if Redis unavailable
   - Health monitoring and alerts

2. **WebSocket Connection Issues**
   - Automatic reconnection for client disconnections
   - Graceful degradation for server issues
   - Connection pooling and cleanup

3. **Rate Limiting**
   - Automatic blocking of excessive requests
   - User-friendly error messages
   - Configurable limits and durations

4. **Data Synchronization**
   - Conflict resolution for duplicate data
   - Automatic retry for failed operations
   - Data validation and sanitization

## 🔄 Migration Guide

### From Existing Implementation

1. **Update Server Entry Point**

   ```typescript
   // Replace existing server with optimized version
   import { OptimizedWebSocketServer } from './websocket/optimized-server';
   ```

2. **Update Client Hooks**

   ```typescript
   // Replace existing WebSocket hook
   import { useOptimizedTeamChatWebSocket } from '@/hooks/useOptimizedTeamChatWebSocket';
   ```

3. **Update Environment Variables**

   ```env
   # Add optimized server configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3001
   PORT=3001
   ```

4. **Run Tests**
   ```bash
   # Ensure all tests pass
   npm test optimized-websocket-redis
   ```

## 📚 API Reference

### WebSocket Events

#### Client to Server

- `room:join` - Join a team chat room
- `room:leave` - Leave a team chat room
- `message:send` - Send a message
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator
- `receipt:update` - Update read receipt
- `heartbeat` - Respond to heartbeat

#### Server to Client

- `presence:list` - List of users in room
- `presence:update` - User presence update
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `receipt:list` - List of read receipts
- `receipt:update` - Read receipt update
- `message:new` - New message received
- `room:error` - Room operation error

### Redis Operations

#### Presence Management

- `updatePresence(teamId, data)` - Update user presence
- `getPresence(teamId)` - Get all users' presence
- `updatePresenceBatch(teamId, dataArray)` - Batch update presence

#### Message Streaming

- `addToMessageStream(teamId, message)` - Add message to stream
- `getMessageStream(teamId, lastId, count)` - Get messages from stream
- `addToMessageStreamBatch(teamId, messages)` - Batch add messages

#### Credit Tracking

- `trackCredits(userId, usage)` - Track credit usage
- `getUnsyncedCredits(userId)` - Get unsynced credits
- `markCreditsSynced(userId, messageIds)` - Mark credits as synced

## 🤝 Contributing

When contributing to the optimized implementation:

1. **Follow the existing patterns** for error handling and logging
2. **Add comprehensive tests** for new features
3. **Update documentation** for any API changes
4. **Consider performance implications** of changes
5. **Test with multiple concurrent connections**

## 📞 Support

For issues or questions about the optimized implementation:

1. Check the test suite for examples
2. Review the error handling documentation
3. Monitor the metrics and health endpoints
4. Check the server logs for detailed error information

---

This optimized implementation provides a robust, scalable, and performant foundation for LobeChat's real-time team chat functionality.
