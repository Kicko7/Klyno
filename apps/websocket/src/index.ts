import express from "express";
import { createServer } from "http";
import { logSessionConfig, validateSessionConfig } from "./config/sessionConfig";
import { startBackgroundSyncWorker } from "./services/sessionManagerFactory";
import { WebSocketServer } from "./server";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || "3001", 10);
const hostname = process.env.HOSTNAME || "localhost";

const server = createServer(app);

(async () => {
  // Validate and log session configuration
  if (!validateSessionConfig()) {
    console.error("❌ Invalid session configuration. Check your environment variables.");
    process.exit(1);
  }
  logSessionConfig();

  // Initialize WebSocket server
  const wsServer = new WebSocketServer(server);
  await wsServer.initialize();

  // Start background sync worker for Redis sessions
  startBackgroundSyncWorker();
  console.log("✅ Background sync worker started");

  // Example REST endpoint
  app.get("/", (_, res) => {
    res.send("Express + WebSocket + Redis server running 🚀");
  });

  server.listen(port, hostname, () => {
    console.log(`> Server listening at http://${hostname}:${port}`);
    console.log(`📊 Redis session management enabled`);
    console.log(`⏰ Sessions expire after 20 minutes of inactivity`);
    console.log(`💾 Max 1000 messages per session before rolling window`);
  });
})();
