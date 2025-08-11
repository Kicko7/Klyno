import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/libs/next-auth';
import { monitoringService } from '@/services/monitoringService';

export async function GET(req: NextRequest) {
  try {
    // Check authentication - only allow authenticated users to access metrics
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get metrics from monitoring service
    const metrics = monitoringService.getMetrics();
    
    if (!metrics) {
      return NextResponse.json(
        { error: 'Monitoring data not available. WebSocket server may not be running.' },
        { status: 503 }
      );
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching monitoring metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring metrics' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD(req: NextRequest) {
  try {
    // Simple health check
    const isHealthy = monitoringService.isHealthy();
    
    if (isHealthy) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 });
    }
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
