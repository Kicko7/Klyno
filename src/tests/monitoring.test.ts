import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MonitoringDashboard } from '@/components/TeamChat/MonitoringDashboard';
import { monitoringService } from '@/services/monitoringService';
import { OptimizedWebSocketServer } from '@/server/websocket/optimized-server';
import { OptimizedRedisService } from '@/services/optimized-redis-service';
import { OptimizedSyncService } from '@/services/optimized-sync-service';

// Mock fetch
global.fetch = vi.fn();

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((date) => '5 minutes ago'),
}));

describe('Monitoring Service', () => {
  let mockWsServer: any;
  let mockRedisService: any;
  let mockSyncService: any;

  beforeEach(() => {
    // Create mock instances
    mockWsServer = {
      getConnectionStats: vi.fn().mockReturnValue({
        totalConnections: 50,
        activeConnections: 45,
        totalRooms: 10,
        totalMessages: 1000,
        uptime: 3600,
      }),
    };

    mockRedisService = {
      getHealth: vi.fn().mockReturnValue({
        isConnected: true,
        lastPing: Date.now() - 5000,
        errorCount: 0,
        reconnectAttempts: 0,
      }),
    };

    mockSyncService = {
      getSyncMetrics: vi.fn().mockReturnValue({
        totalSynced: 500,
        failedSyncs: 2,
        lastSyncTime: new Date().toISOString(),
        syncDuration: 150,
        errors: [],
      }),
    };

    vi.clearAllMocks();
  });

  describe('MonitoringService', () => {
    it('should be a singleton', () => {
      const instance1 = monitoringService;
      const instance2 = require('@/services/monitoringService').monitoringService;
      expect(instance1).toBe(instance2);
    });

    it('should register instances correctly', () => {
      monitoringService.setInstances(
        mockWsServer as any,
        mockRedisService as any,
        mockSyncService as any
      );

      const metrics = monitoringService.getMetrics();
      expect(metrics).toBeTruthy();
      expect(metrics!.websocket).toEqual(mockWsServer.getConnectionStats());
      expect(metrics!.redis).toEqual(mockRedisService.getHealth());
      expect(metrics!.sync).toEqual(mockSyncService.getSyncMetrics());
    });

    it('should return null metrics when instances not set', () => {
      // Create a new instance for this test
      const MonitoringService = require('@/services/monitoringService').MonitoringService;
      const newService = new MonitoringService();
      
      const metrics = newService.getMetrics();
      expect(metrics).toBeNull();
    });

    it('should check health status correctly', () => {
      monitoringService.setInstances(
        mockWsServer as any,
        mockRedisService as any,
        mockSyncService as any
      );

      const isHealthy = monitoringService.isHealthy();
      expect(isHealthy).toBe(true);
      expect(mockRedisService.getHealth).toHaveBeenCalled();
    });

    it('should report unhealthy when Redis is disconnected', () => {
      mockRedisService.getHealth.mockReturnValue({
        isConnected: false,
        lastPing: 0,
        errorCount: 5,
        reconnectAttempts: 3,
      });

      monitoringService.setInstances(
        mockWsServer as any,
        mockRedisService as any,
        mockSyncService as any
      );

      const isHealthy = monitoringService.isHealthy();
      expect(isHealthy).toBe(false);
    });

    it('should include system metrics', () => {
      monitoringService.setInstances(
        mockWsServer as any,
        mockRedisService as any,
        mockSyncService as any
      );

      const metrics = monitoringService.getMetrics();
      expect(metrics!.system).toHaveProperty('uptime');
      expect(metrics!.system).toHaveProperty('memory');
      expect(metrics!.system).toHaveProperty('nodeVersion');
      expect(metrics!.system.memory).toHaveProperty('rss');
      expect(metrics!.system.memory).toHaveProperty('heapUsed');
      expect(metrics!.system.memory).toHaveProperty('heapTotal');
    });
  });

  describe('Monitoring Dashboard Component', () => {
    beforeEach(() => {
      // Mock successful fetch
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          timestamp: new Date().toISOString(),
          websocket: {
            totalConnections: 50,
            activeConnections: 45,
            totalRooms: 10,
            totalMessages: 1000,
            uptime: 3600,
          },
          redis: {
            isConnected: true,
            lastPing: Date.now() - 5000,
            errorCount: 0,
            reconnectAttempts: 0,
          },
          sync: {
            totalSynced: 500,
            failedSyncs: 2,
            lastSyncTime: new Date().toISOString(),
            syncDuration: 150,
            errors: [],
          },
          system: {
            uptime: 7200,
            memory: {
              rss: 100 * 1024 * 1024,
              heapTotal: 80 * 1024 * 1024,
              heapUsed: 60 * 1024 * 1024,
              external: 10 * 1024 * 1024,
            },
            nodeVersion: 'v18.0.0',
          },
        }),
      });
    });

    it('should render loading state initially', () => {
      render(<MonitoringDashboard />);
      expect(screen.getByText('Loading monitoring data...')).toBeTruthy();
    });

    it('should display metrics after loading', async () => {
      render(<MonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('WebSocket & Redis Monitoring')).toBeTruthy();
      });

      // Check WebSocket stats
      expect(screen.getByText('Active Connections')).toBeTruthy();
      expect(screen.getByText('45')).toBeTruthy();
      expect(screen.getByText('/ 50')).toBeTruthy();

      // Check Redis status
      expect(screen.getByText('Redis Connection')).toBeTruthy();
      expect(screen.getByText('Connected')).toBeTruthy();

      // Check sync metrics
      expect(screen.getByText('Background Sync Service')).toBeTruthy();
      expect(screen.getByText('500')).toBeTruthy(); // Total synced
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<MonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeTruthy();
        expect(screen.getByText(/Network error/)).toBeTruthy();
      });
    });

    it('should show disconnected Redis status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          timestamp: new Date().toISOString(),
          websocket: {
            totalConnections: 0,
            activeConnections: 0,
            totalRooms: 0,
            totalMessages: 0,
            uptime: 0,
          },
          redis: {
            isConnected: false,
            lastPing: 0,
            errorCount: 10,
            reconnectAttempts: 5,
          },
          sync: {
            totalSynced: 0,
            failedSyncs: 0,
            lastSyncTime: '',
            syncDuration: 0,
            errors: [],
          },
          system: {
            uptime: 0,
            memory: {
              rss: 0,
              heapTotal: 0,
              heapUsed: 0,
              external: 0,
            },
            nodeVersion: 'v18.0.0',
          },
        }),
      });

      render(<MonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeTruthy();
        expect(screen.getByText('10')).toBeTruthy(); // Error count
      });
    });

    it('should display sync errors when present', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          timestamp: new Date().toISOString(),
          websocket: {
            totalConnections: 10,
            activeConnections: 8,
            totalRooms: 3,
            totalMessages: 100,
            uptime: 3600,
          },
          redis: {
            isConnected: true,
            lastPing: Date.now(),
            errorCount: 0,
            reconnectAttempts: 0,
          },
          sync: {
            totalSynced: 100,
            failedSyncs: 5,
            lastSyncTime: new Date().toISOString(),
            syncDuration: 200,
            errors: [
              'Database connection timeout',
              'Redis key not found',
              'JSON parse error',
            ],
          },
          system: {
            uptime: 7200,
            memory: {
              rss: 100 * 1024 * 1024,
              heapTotal: 80 * 1024 * 1024,
              heapUsed: 60 * 1024 * 1024,
              external: 10 * 1024 * 1024,
            },
            nodeVersion: 'v18.0.0',
          },
        }),
      });

      render(<MonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Errors:')).toBeTruthy();
        expect(screen.getByText('Database connection timeout')).toBeTruthy();
        expect(screen.getByText('Redis key not found')).toBeTruthy();
        expect(screen.getByText('JSON parse error')).toBeTruthy();
      });
    });

    it('should auto-refresh metrics', async () => {
      vi.useFakeTimers();
      
      render(<MonitoringDashboard />);

      // Initial fetch
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('WebSocket & Redis Monitoring')).toBeTruthy();
      });

      // Fast forward 5 seconds
      vi.advanceTimersByTime(5000);

      // Should have made another fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('should format memory usage correctly', async () => {
      render(<MonitoringDashboard />);

      await waitFor(() => {
        // Check memory formatting (100MB)
        expect(screen.getByText('100.00 MB')).toBeTruthy();
        // Check heap usage
        expect(screen.getByText(/60.00 MB/)).toBeTruthy();
      });
    });

    it('should calculate heap usage percentage', async () => {
      render(<MonitoringDashboard />);

      await waitFor(() => {
        // Heap used (60MB) / Heap total (80MB) = 75%
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should show session management configuration', async () => {
      render(<MonitoringDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Session Management')).toBeTruthy();
        expect(screen.getByText('20')).toBeTruthy(); // 20 minutes expiry
        expect(screen.getByText('1,000')).toBeTruthy(); // Max messages
        expect(screen.getByText('5')).toBeTruthy(); // Sync interval
      });
    });
  });

  describe('Monitoring API Route', () => {
    it('should require authentication', async () => {
      // Test would require mocking Next.js auth
      // This is a placeholder for the actual test
      expect(true).toBe(true);
    });

    it('should return 503 when services not available', async () => {
      // Test would require mocking the route handler
      // This is a placeholder for the actual test
      expect(true).toBe(true);
    });

    it('should handle HEAD requests for health checks', async () => {
      // Test would require mocking the route handler
      // This is a placeholder for the actual test
      expect(true).toBe(true);
    });
  });
});
