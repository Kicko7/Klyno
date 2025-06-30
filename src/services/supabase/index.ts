import { SupabaseDatabaseAdapter, supabaseDB } from '@/database/core/supabase';
import { supabase } from '@/libs/supabase';
import type { Database } from '@/types/supabase';

// Define missing types locally
type TeamRole = 'owner' | 'admin' | 'member';
type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

interface RealtimeEvent<T = unknown> {
  oldRecord?: T;
  record: T;
  table: string;
  type: 'insert' | 'update' | 'delete';
}

export const SupabaseService = {
  async addTeamMember(teamId: string, userId: string, role: TeamRole = 'member') {
    return await supabaseDB.addTeamMember(teamId, userId, role);
  },

  async addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole = 'member') {
    return await supabaseDB.addWorkspaceMember(workspaceId, userId, role);
  },

  // Prompt templates
  async createPromptTemplate(templateData: Record<string, unknown>) {
    return await supabaseDB.createPromptTemplate(templateData);
  },

  // Team services
  async createTeam(teamData: Database['public']['Tables']['teams']['Insert']) {
    return await supabaseDB.createTeam(teamData);
  },

  // Conversation services
  async createTeamConversation(conversationData: Record<string, unknown>) {
    return await supabaseDB.createTeamConversation(conversationData);
  },

  // Message services
  async createTeamMessage(messageData: Record<string, unknown>) {
    return await supabaseDB.createTeamMessage(messageData);
  },

  // Workspace services
  async createWorkspace(workspaceData: Database['public']['Tables']['workspaces']['Insert']) {
    return await supabaseDB.createWorkspace(workspaceData);
  },

  // Add missing deleteUser method
  async deleteUser(id: string) {
    return await SupabaseDatabaseAdapter.deleteUser(id);
  },

  async getTeamConversations(teamId: string) {
    return await supabaseDB.getTeamConversations(teamId);
  },

  async getTeamMessages(conversationId: string) {
    return await supabaseDB.getTeamMessages(conversationId);
  },

  async getTeamPromptTemplates() {
    return await supabaseDB.getTeamPromptTemplates();
  },

  async getTeamUsage(teamId: string) {
    return await supabaseDB.getTeamUsage(teamId);
  },

  async getUserPromptTemplates(userId: string) {
    return await supabaseDB.getUserPromptTemplates(userId);
  },

  async getUserTeams(userId: string) {
    return await supabaseDB.getTeamsByUserId(userId);
  },

  async getUserUsage(userId: string) {
    return await supabaseDB.getUserUsage(userId);
  },

  async getWorkspacesByTeamId(teamId: string) {
    return await supabaseDB.getWorkspacesByTeamId(teamId);
  },

  async removeTeamMember(teamId: string, userId: string) {
    return await supabaseDB.removeTeamMember(teamId, userId);
  },

  // Real-time subscriptions
  subscribeToTeamMessages(
    teamId: string,
    callback: (payload: RealtimeEvent<Record<string, unknown>>) => void,
  ) {
    return supabase
      .channel(`team-messages-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `conversation_id=in.(select conversation_id from team_conversations where team_id='${teamId}')`,
          schema: 'public',
          table: 'team_messages',
        },
        (payload) => {
          const event: RealtimeEvent<Record<string, unknown>> = {
            oldRecord: payload.old as Record<string, unknown>,
            record: payload.new as Record<string, unknown>,
            table: 'team_messages',
            type: payload.eventType as 'insert' | 'update' | 'delete',
          };
          callback(event);
        },
      )
      .subscribe();
  },

  subscribeToTeamUpdates(
    teamId: string,
    callback: (payload: RealtimeEvent<Database['public']['Tables']['teams']['Row']>) => void,
  ) {
    return supabase
      .channel(`team-updates-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `id=eq.${teamId}`,
          schema: 'public',
          table: 'teams',
        },
        (payload) => {
          const event: RealtimeEvent<Database['public']['Tables']['teams']['Row']> = {
            oldRecord: payload.old as Database['public']['Tables']['teams']['Row'],
            record: payload.new as Database['public']['Tables']['teams']['Row'],
            table: 'teams',
            type: payload.eventType as 'insert' | 'update' | 'delete',
          };
          callback(event);
        },
      )
      .subscribe();
  },

  subscribeToWorkspaceMessages(
    workspaceId: string,
    callback: (payload: RealtimeEvent<Record<string, unknown>>) => void,
  ) {
    return supabase
      .channel(`workspace-messages-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `conversation_id=in.(select conversation_id from team_conversations where workspace_id='${workspaceId}')`,
          schema: 'public',
          table: 'team_messages',
        },
        (payload) => {
          const event: RealtimeEvent<Record<string, unknown>> = {
            oldRecord: payload.old as Record<string, unknown>,
            record: payload.new as Record<string, unknown>,
            table: 'team_messages',
            type: payload.eventType as 'insert' | 'update' | 'delete',
          };
          callback(event);
        },
      )
      .subscribe();
  },

  // User services
  async syncUserWithClerk(clerkUser: Record<string, unknown>) {
    try {
      // First, ensure the user exists in the base users table
      await supabaseDB.ensureUserExists(clerkUser.id as string, {
        avatar: clerkUser.imageUrl as string,
        email: (clerkUser.emailAddresses as Array<{ emailAddress: string }>)?.[0]?.emailAddress,
        firstName: clerkUser.firstName as string,
        lastName: clerkUser.lastName as string,
      });

      // Then sync with Klyno user profile
      return await supabaseDB.syncKlynoUser(clerkUser.id as string, {
        avatar: clerkUser.imageUrl as string,
        clerkId: clerkUser.id as string,
        email: (clerkUser.emailAddresses as Array<{ emailAddress: string }>)?.[0]?.emailAddress,
        firstName: clerkUser.firstName as string,
        lastName: clerkUser.lastName as string,
      });
    } catch (error) {
      console.error('Error syncing user with Clerk:', error);
      throw error;
    }
  },

  // Utility methods
  async testConnection() {
    try {
      const { error } = await supabase.from('users').select('count').limit(1);

      if (error) {
        throw error;
      }

      return { message: 'Supabase connection successful', success: true };
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  },

  // Usage tracking
  async trackUsage(usageData: Record<string, unknown>) {
    return await supabaseDB.trackUsage(usageData);
  },

  async updateUserProfile(
    userId: string,
    profile: Partial<Database['public']['Tables']['users']['Update']>,
  ) {
    return await supabaseDB.updateUser(userId, profile);
  },

  // Subscription management
  async updateUserSubscription(
    userId: string,
    subscriptionData: {
      status?: 'active' | 'canceled' | 'past_due';
      stripeCustomerId?: string;
      tier?: 'starter' | 'pro' | 'ultimate';
    },
  ) {
    return await supabaseDB.updateUserSubscription(userId, subscriptionData);
  },

  async updateUserUsage(
    userId: string,
    usageData: {
      current?: number;
      quota?: number;
    },
  ) {
    return await supabaseDB.updateUserUsage(userId, usageData);
  },
};
