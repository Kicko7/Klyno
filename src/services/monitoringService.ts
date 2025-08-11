import { OptimizedWebSocketServer } from '@/server/websocket/optimized-server';
import { OptimizedRedisService } from './optimized-redis-service';
import { OptimizedSyncService } from './optimized-sync-service';

interface MonitoringInstances {
  wsServer: OptimizedWebSocketServer | null;
  redisService: OptimizedRedisService | null;
  syncService: OptimizedSyncService | null;
}

class MonitoringService {
  private static instance: MonitoringService;
  private instances: MonitoringInstances = {
    wsServer: null,
    redisService: null,
    syncService: null,
  };

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  setInstances(
    wsServer: OptimizedWebSocketServer,
    redisService: OptimizedRedisService,
    syncService: OptimizedSyncService
  ) {
    this.instances = {
      wsServer,
      redisService,
      syncService,
    };
    console.log('📊 Monitoring instances registered');
  }

  getMetrics() {
    const { wsServer, redisService, syncService } = this.instances;

    if (!wsServer || !redisService || !syncService) {
      return null;
    }

    return {
      timestamp: new Date().toISOString(),
      websocket: wsServer.getConnectionStats(),
      redis: redisService.getHealth(),
      sync: syncService.getSyncMetrics(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };
  }

  isHealthy(): boolean {
    const { wsServer, redisService, syncService } = this.instances;
    if (!wsServer || !redisService || !syncService) {
      return false;
    }

    const redisHealth = redisService.getHealth();
    return redisHealth.isConnected;
  }
}

export const monitoringService = MonitoringService.getInstance();
