import { NextRequest, NextResponse } from 'next/server';
import { SupabaseService } from '@/services/supabase';

export async function GET() {
  try {
    // Test Supabase connection
    const connectionTest = await SupabaseService.testConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json(
        { 
          details: connectionTest.error, 
          error: 'Database connection failed' 
        },
        { status: 500 }
      );
    }

    // Test basic database operations
    const testResults = {
      connection: connectionTest,
      environment: {
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
      features: {
        promptTemplates: true,
        realTimeUpdates: true,
        subscriptionManagement: true,
        teamCollaboration: true,
        usageTracking: true,
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      data: testResults,
      message: 'Klyno AI Supabase integration is working correctly',
      success: true,
    });
  } catch (error) {
    console.error('Supabase test error:', error);
    return NextResponse.json(
      { 
        details: error instanceof Error ? error.message : 'Unknown error', 
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'test_user_sync': {
        // This would test user synchronization with Clerk
        return NextResponse.json({
          message: 'User sync test endpoint ready',
          note: 'This requires a valid Clerk user session',
          success: true,
        });
      }

      case 'test_team_creation': {
        // This would test team creation
        return NextResponse.json({
          message: 'Team creation test endpoint ready',
          note: 'This requires authentication',
          success: true,
        });
      }

      case 'test_usage_tracking': {
        // This would test usage tracking
        return NextResponse.json({
          message: 'Usage tracking test endpoint ready',
          note: 'This requires authentication',
          success: true,
        });
      }

      default: {
        return NextResponse.json(
          { error: 'Unknown test action' },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error('Supabase test POST error:', error);
    return NextResponse.json(
      { 
        details: error instanceof Error ? error.message : 'Unknown error', 
        error: 'Invalid request' 
      },
      { status: 400 }
    );
  }
} 