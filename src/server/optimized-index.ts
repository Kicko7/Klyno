import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';

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
