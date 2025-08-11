import { Card, Col, Progress, Row, Statistic, Tag, Typography } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  CloudServerOutlined,
  TeamOutlined,
  MessageOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

const { Title, Text } = Typography;

interface MonitoringMetrics {
  timestamp: string;
  websocket: {
    totalConnections: number;
    activeConnections: number;
    totalRooms: number;
    totalMessages: number;
    uptime: number;
  };
  redis: {
    isConnected: boolean;
    lastPing: number;
    errorCount: number;
    reconnectAttempts: number;
  };
  sync: {
    totalSynced: number;
    failedSyncs: number;
    lastSyncTime: string;
    syncDuration: number;
    errors: string[];
  };
  system: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    nodeVersion: string;
  };
}

export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/monitoring/websocket');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMetrics(data);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh metrics every 5 seconds
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <SyncOutlined spin style={{ fontSize: 32 }} />
        <p>Loading monitoring data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <CloseCircleOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>No monitoring data available</p>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>
          <CloudServerOutlined /> WebSocket & Redis Monitoring
        </Title>
        <Text type="secondary">
          Last updated: {formatDistanceToNow(lastUpdate, { addSuffix: true })}
        </Text>
      </div>

      {/* WebSocket Stats */}
      <Card title="WebSocket Server" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Active Connections"
              value={metrics.websocket.activeConnections}
              prefix={<TeamOutlined />}
              suffix={`/ ${metrics.websocket.totalConnections}`}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Active Rooms"
              value={metrics.websocket.totalRooms}
              prefix={<DatabaseOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Messages"
              value={metrics.websocket.totalMessages}
              prefix={<MessageOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Uptime"
              value={formatUptime(metrics.websocket.uptime)}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Redis Health */}
      <Card 
        title="Redis Connection" 
        style={{ marginBottom: 16 }}
        extra={
          metrics.redis.isConnected ? (
            <Tag icon={<CheckCircleOutlined />} color="success">
              Connected
            </Tag>
          ) : (
            <Tag icon={<CloseCircleOutlined />} color="error">
              Disconnected
            </Tag>
          )
        }
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Last Ping"
              value={metrics.redis.lastPing ? 
                formatDistanceToNow(new Date(metrics.redis.lastPing), { addSuffix: true }) : 
                'Never'
              }
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Error Count"
              value={metrics.redis.errorCount}
              valueStyle={{ color: metrics.redis.errorCount > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Reconnect Attempts"
              value={metrics.redis.reconnectAttempts}
            />
          </Col>
          <Col span={6}>
            <div>
              <Text type="secondary">Connection Health</Text>
              <Progress 
                percent={metrics.redis.isConnected ? 100 : 0} 
                status={metrics.redis.isConnected ? 'success' : 'exception'}
                showInfo={false}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Sync Service */}
      <Card 
        title="Background Sync Service" 
        style={{ marginBottom: 16 }}
        extra={
          <Tag color={metrics.sync.failedSyncs > 0 ? 'warning' : 'success'}>
            {metrics.sync.failedSyncs === 0 ? 'Healthy' : 'Has Failures'}
          </Tag>
        }
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Synced"
              value={metrics.sync.totalSynced}
              prefix={<SyncOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Failed Syncs"
              value={metrics.sync.failedSyncs}
              valueStyle={{ color: metrics.sync.failedSyncs > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Last Sync"
              value={metrics.sync.lastSyncTime ? 
                formatDistanceToNow(new Date(metrics.sync.lastSyncTime), { addSuffix: true }) : 
                'Never'
              }
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Sync Duration"
              value={metrics.sync.syncDuration}
              suffix="ms"
            />
          </Col>
        </Row>
        {metrics.sync.errors.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text type="danger">Recent Errors:</Text>
            <ul style={{ marginTop: 8 }}>
              {metrics.sync.errors.slice(0, 3).map((error, index) => (
                <li key={index}>
                  <Text code>{error}</Text>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* System Stats */}
      <Card title="System Resources" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="System Uptime"
              value={formatUptime(metrics.system.uptime)}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Memory (RSS)"
              value={formatBytes(metrics.system.memory.rss)}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Heap Used"
              value={formatBytes(metrics.system.memory.heapUsed)}
              suffix={`/ ${formatBytes(metrics.system.memory.heapTotal)}`}
            />
          </Col>
          <Col span={6}>
            <div>
              <Text type="secondary">Heap Usage</Text>
              <Progress 
                percent={Math.round((metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100)} 
                status="active"
              />
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Node Version: {metrics.system.nodeVersion}</Text>
        </div>
      </Card>

      {/* Session Management Stats */}
      <Card title="Session Management" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Session Expiry"
              value="20"
              suffix="minutes"
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Max Messages/Session"
              value="1,000"
              prefix={<MessageOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Sync Interval"
              value="5"
              suffix="minutes"
              prefix={<SyncOutlined />}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};
