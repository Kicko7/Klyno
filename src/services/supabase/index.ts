import { SupabaseDatabaseAdapter, supabaseDB } from '@/database/core/supabase';
import { supabase } from '@/libs/supabase';
import type { Database } from '@/types/supabase';

export const SupabaseService = {
  async addTeamMember(
    teamId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member' = 'member',
  ) {
    return await supabaseDB.addTeamMember(teamId, userId, role);
  },

  async addWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member' | 'viewer' = 'member',
  ) {
    return await supabaseDB.addWorkspaceMember(workspaceId, userId, role);
  },

  // Prompt templates
  async createPromptTemplate(templateData: any) {
    return await supabaseDB.createPromptTemplate(templateData);
  },

  // Team services
  async createTeam(teamData: Database['public']['Tables']['teams']['Insert']) {
    return await supabaseDB.createTeam(teamData);
  },

  // Conversation services
  async createTeamConversation(conversationData: any) {
    return await supabaseDB.createTeamConversation(conversationData);
  },

  // Message services
  async createTeamMessage(messageData: any) {
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
  subscribeToTeamMessages(teamId: string, callback: (payload: any) => void) {
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
        callback,
      )
      .subscribe();
  },

  subscribeToTeamUpdates(teamId: string, callback: (payload: any) => void) {
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
        callback,
      )
      .subscribe();
  },

  subscribeToWorkspaceMessages(workspaceId: string, callback: (payload: any) => void) {
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
        callback,
      )
      .subscribe();
  },

  // User services
  async syncUserWithClerk(clerkUser: any) {
    try {
      // First, ensure the user exists in the base users table
      await supabaseDB.ensureUserExists(clerkUser.id, {
        avatar: clerkUser.imageUrl,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      });

      // Then sync with Klyno user profile
      return await supabaseDB.syncKlynoUser(clerkUser.id, {
        avatar: clerkUser.imageUrl,
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
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
  async trackUsage(usageData: any) {
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
