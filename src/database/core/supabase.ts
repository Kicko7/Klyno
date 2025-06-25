import { createServerSupabaseClient } from '@/libs/supabase';
import type { Database } from '@/types/supabase';

export class SupabaseDatabaseAdapter {
  private client: ReturnType<typeof createServerSupabaseClient>;

  constructor() {
    this.client = createServerSupabaseClient();
  }

  // User management - integrates with existing LobeChat users
  async ensureUserExists(
    userId: string,
    userData: {
      avatar?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    const { data, error } = await this.client
      .from('users')
      .upsert({
        avatar_url: userData.avatar,
        clerk_id: userId,
        email: userData.email,
        first_name: userData.firstName,
        id: userId,
        last_name: userData.lastName,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async syncKlynoUser(
    userId: string,
    klynoUserData: {
      avatar?: string;
      clerkId: string;
      email?: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    const { data, error } = await this.client
      .from('users')
      .upsert({
        avatar_url: klynoUserData.avatar,
        clerk_id: klynoUserData.clerkId,
        email: klynoUserData.email,
        first_name: klynoUserData.firstName,
        id: userId,
        last_name: klynoUserData.lastName,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserByClerkId(clerkId: string) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(
    userId: string,
    updates: Partial<Database['public']['Tables']['users']['Update']>,
  ) {
    const { data, error } = await this.client
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Team management
  async createTeam(teamData: Database['public']['Tables']['teams']['Insert']) {
    const { data, error } = await this.client.from('teams').insert(teamData).select().single();

    if (error) throw error;
    return data;
  }

  async getTeamsByUserId(userId: string) {
    const { data, error } = await this.client
      .from('team_members')
      .select(
        `
        *,
        teams (*)
      `,
      )
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member' = 'member',
  ) {
    const { data, error } = await this.client
      .from('team_members')
      .insert({
        role,
        team_id: teamId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeTeamMember(teamId: string, userId: string) {
    const { error } = await this.client
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  }

  // Workspace management
  async createWorkspace(workspaceData: Database['public']['Tables']['workspaces']['Insert']) {
    const { data, error } = await this.client
      .from('workspaces')
      .insert(workspaceData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkspacesByTeamId(teamId: string) {
    const { data, error } = await this.client.from('workspaces').select('*').eq('team_id', teamId);

    if (error) throw error;
    return data;
  }

  async addWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member' | 'viewer' = 'member',
  ) {
    const { data, error } = await this.client
      .from('team_members')
      .insert({
        role,
        team_id: workspaceId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Team conversation management
  async createTeamConversation(conversationData: any) {
    const { data, error } = await this.client
      .from('conversations')
      .insert({
        ...conversationData,
        title: conversationData.title || 'Team Conversation',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTeamConversations(teamId: string) {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('user_id', teamId);

    if (error) throw error;
    return data;
  }

  // Team message management
  async createTeamMessage(messageData: any) {
    const { data, error } = await this.client
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTeamMessages(conversationId: string) {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId);

    if (error) throw error;
    return data;
  }

  // Usage tracking
  async trackUsage(usageData: any) {
    const { data, error } = await this.client
      .from('usage_logs')
      .insert({
        ...usageData,
        cost: usageData.cost || 0,
        credits_used: usageData.creditsUsed || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserUsage(userId: string) {
    const { data, error } = await this.client.from('usage_logs').select('*').eq('user_id', userId);
    if (error) throw error;
    return data;
  }

  async getTeamUsage(teamId: string) {
    const { data, error } = await this.client.from('usage_logs').select('*').eq('team_id', teamId);

    if (error) throw error;
    return data;
  }

  // Prompt templates
  async createPromptTemplate(templateData: any) {
    const { data, error } = await this.client
      .from('user_settings')
      .upsert({
        settings: {
          promptTemplates: [templateData],
        },
        updated_at: new Date().toISOString(),
        user_id: templateData.userId || templateData.user_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserPromptTemplates(userId: string) {
    const { data, error } = await this.client
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    const settings = data?.settings as any;
    return settings?.promptTemplates || [];
  }

  async getTeamPromptTemplates() {
    // TODO: Implement team prompt templates when the feature is ready
    // For now, return empty array as placeholder
    return [];
  }

  // Subscription management
  async updateUserSubscription(
    userId: string,
    subscriptionData: {
      status?: 'active' | 'canceled' | 'past_due';
      stripeCustomerId?: string;
      tier?: 'starter' | 'pro' | 'ultimate';
    },
  ) {
    const { data, error } = await this.client
      .from('users')
      .update({
        stripe_customer_id: subscriptionData.stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUserUsage(
    userId: string,
    usageData: {
      current?: number;
      quota?: number;
    },
  ) {
    const { data, error } = await this.client
      .from('user_settings')
      .upsert({
        settings: {
          usage: usageData,
        },
        updated_at: new Date().toISOString(),
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteUser(id: string) {
    const client = createServerSupabaseClient();
    const { error } = await client.from('users').delete().eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async getUserAvatar() {
    // TODO: Implement avatar retrieval when file storage is set up
    // For now, return null as placeholder
    return null;
  }
}

// Export singleton instance
export const supabaseDB = new SupabaseDatabaseAdapter();
