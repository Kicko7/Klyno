import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';

import { logSessionConfig, validateSessionConfig } from '@/config/sessionConfig';
import { monitoringService } from '@/services/monitoringService';
import { OptimizedRedisService } from '@/services/optimized-redis-service';
import { getOptimizedRedisService } from '@/services/optimized-redis-service-factory';
import { OptimizedSyncService } from '@/services/optimized-sync-service';
import { startBackgroundSyncWorker } from '@/services/sessionManagerFactory';

import { OptimizedWebSocketServer } from './websocket/optimized-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Validate and log session configuration
  if (!validateSessionConfig()) {
    console.error('Invalid session configuration. Please check your environment variables.');
    process.exit(1);
  }
  logSessionConfig();

  // Initialize optimized WebSocket server with Redis
  const wsServer = new OptimizedWebSocketServer(server);

  // Set up event listeners for monitoring
  wsServer.on('socket:error', (data) => {
    console.error('Socket error:', data);
  });

  wsServer.on('socket:disconnect', (data) => {
    console.log('Socket disconnected:', data);
  });

  wsServer.on('room:join:error', (data) => {
    console.error('Room join error:', data);
  });

  wsServer.on('message:send:error', (data) => {
    console.error('Message send error:', data);
  });

  wsServer.on('connection:error', (error) => {
    console.error('Connection error:', error);
  });

  try {
    await wsServer.initialize();

    // Get service instances for monitoring
    const redisService = await getOptimizedRedisService();
    const syncService = new OptimizedSyncService(redisService as any);

    // Register instances with monitoring service
    monitoringService.setInstances(wsServer, redisService as OptimizedRedisService, syncService);

    // Start background sync for Redis sessions and credits
    startBackgroundSyncWorker();
    syncService.startSync();
    console.log('✅ Background sync workers started');
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
    process.exit(1);
  }

  server.listen(port, () => {
    console.log(
      `> Optimized server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.NODE_ENV
      }`,
    );
    console.log(`📊 Redis session management enabled`);
    console.log(`⏰ Sessions expire after 20 minutes of inactivity`);
    console.log(`💾 Max 1000 messages per session before rolling window`);
    console.log(`🔄 Background sync runs every 5 minutes`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = async () => {
    console.log('🔄 Received shutdown signal, starting graceful shutdown...');

    try {
      await wsServer.gracefulShutdown();
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
});
