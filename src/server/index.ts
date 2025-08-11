import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';

import { WebSocketServer } from './websocket/server';
import { startBackgroundSyncWorker } from '@/services/sessionManagerFactory';
import { logSessionConfig, validateSessionConfig } from '@/config/sessionConfig';

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

  // Initialize WebSocket server with Redis
  const wsServer = new WebSocketServer(server);
  await wsServer.initialize();

  // Start background sync worker for Redis sessions
  startBackgroundSyncWorker();
  console.log('✅ Background sync worker started');

  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.NODE_ENV
      }`,
    );
    console.log(`📊 Redis session management enabled`);
    console.log(`⏰ Sessions expire after 20 minutes of inactivity`);
    console.log(`💾 Max 1000 messages per session before rolling window`);
  });
});
