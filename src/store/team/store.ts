import { StateCreator } from 'zustand';

import { lambdaClient } from '@/libs/trpc/client';

export interface Team {
  accessedAt?: Date;
  createdAt?: Date;
  description?: string;
  id: string;
  name: string;
  organizationId: string;
  updatedAt?: Date;
}

export interface TeamMember {
  createdAt?: Date;
  id: string;
  role: 'admin' | 'member';
  teamId: string;
  updatedAt?: Date;
  userId: string;
}

export interface TeamChannel {
  createdAt?: Date;
  description?: string;
  id: string;
  isArchived: boolean;
  isPrivate: boolean;
  name: string;
  teamId: string;
  type: 'general' | 'announcement' | 'project' | 'random';
  updatedAt?: Date;
}

export interface TeamMessage {
  channelId: string;
  content: string;
  createdAt?: Date;
  id: string;
  isDeleted: boolean;
  isEdited: boolean;
  metadata?: Record<string, any>;
  senderId: string;
  type: 'text' | 'ai_chat';
  updatedAt?: Date;
}

export interface TeamStore {
  // State
  channels: TeamChannel[];
  clearError: () => void;
  createTeam: (data: {
    description?: string;
    name: string;
    organizationId: string;
  }) => Promise<Team>;
  currentChannel: TeamChannel | null;
  currentTeam: Team | null;
  deleteTeam: (teamId: string) => Promise<void>;
  error: string | null;
  fetchMembers: (teamId: string) => Promise<void>;
  fetchMessages: (channelId: string, limit?: number, offset?: number) => Promise<void>;
  fetchTeams: () => Promise<void>;
  inviteMember: (teamId: string, email: string, role: 'admin' | 'member') => Promise<void>;
  loadingChannels: boolean;
  loadingMembers: boolean;
  loadingMessages: boolean;
  loadingTeams: boolean;
  members: TeamMember[];
  messages: TeamMessage[];
  removeMember: (teamId: string, memberId: string) => Promise<void>;
  reset: () => void;
  setCurrentChannel: (channel: TeamChannel | null) => void;
  setCurrentTeam: (team: Team | null) => void;
  teams: Team[];
  updateTeam: (teamId: string, data: { description?: string; name?: string }) => Promise<void>;
}

export const createTeamStore: StateCreator<TeamStore> = (set, get) => ({
  // Initial state
  currentTeam: null,
  teams: [],
  channels: [],
  currentChannel: null,
  members: [],
  messages: [],
  error: null,
  loadingChannels: false,
  loadingMembers: false,
  loadingMessages: false,
  loadingTeams: false,

  // Actions
  setCurrentTeam: (team) => set({ currentTeam: team }),
  setCurrentChannel: (channel) => set({ currentChannel: channel }),

  // Team actions
  fetchTeams: async () => {
    set({ loadingTeams: true, error: null });
    try {
      console.log('Fetching user teams...');
      // First get user's organizations
      const organizations = await lambdaClient.organization.getMyOrganizations.query();

      if (organizations.length > 0) {
        const userTeams = await lambdaClient.organization.getOrganizationTeams.query({
          organizationId: organizations[0].id,
        });
        console.log('Fetched teams:', userTeams);

        // Transform the API response to match our Team interface
        const transformedTeams: Team[] = userTeams.map((team: any) => ({
          id: team.id,
          name: team.name,
          slug: team.slug || team.name.toLowerCase().replace(/\s+/g, '-'),
          organizationId: team.organizationId,
          description: team.description,
          updatedAt: team.updatedAt,
          createdAt: team.createdAt,
          accessedAt: team.accessedAt,
        }));

        set({ teams: transformedTeams, loadingTeams: false });
      } else {
        set({ teams: [], loadingTeams: false });
      }
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      set({ error: error.message, loadingTeams: false });
    }
  },

  createTeam: async (data) => {
    try {
      console.log('Creating team with data:', data);
      const team = await lambdaClient.organization.createTeam.mutate({
        ...data,
      });
      console.log('Team created:', team);
      console.log('Refreshing teams list...');
      await get().fetchTeams();

      // Transform the response to match our Team interface
      const transformedTeam: Team = {
        id: team.id,
        name: team.name,
        organizationId: team.organizationId,
        updatedAt: team.updatedAt,
        createdAt: team.createdAt,
        accessedAt: team.accessedAt,
      };

      return transformedTeam;
    } catch (error: any) {
      console.error('Error creating team:', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateTeam: async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    try {
      // Note: updateTeam method doesn't exist in the current API
      // This would need to be implemented in the backend
      console.warn('updateTeam method not implemented in current API');
      await get().fetchTeams();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteTeam: async (teamId) => {
    try {
      // Note: deleteTeam method doesn't exist in the current API
      // This would need to be implemented in the backend
      console.warn('deleteTeam method not implemented in current API');
      await get().fetchTeams();
      if (get().currentTeam?.id === teamId) {
        set({ currentTeam: null, currentChannel: null, channels: [], members: [], messages: [] });
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  // Member actions
  fetchMembers: async (teamId) => {
    set({ loadingMembers: true, error: null });
    try {
      const members = await lambdaClient.organization.getTeamMembers.query({ teamId });
      // Transform the API response to match our TeamMember interface
      const transformedMembers: TeamMember[] = members.map((member: any) => ({
        id: member.id,
        userId: member.userId,
        teamId: member.teamId,
        role: member.role === 'owner' ? 'admin' : member.role,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      }));
      set({ members: transformedMembers, loadingMembers: false });
    } catch (error: any) {
      set({ error: error.message, loadingMembers: false });
    }
  },

  inviteMember: async (teamId, email, role) => {
    try {
      // Get the current organization ID from the first organization
      const organizations = await lambdaClient.organization.getMyOrganizations.query();
      if (organizations.length === 0) {
        throw new Error('No organization found');
      }

      await lambdaClient.organization.inviteMember.mutate({
        teamId,
        email,
        role,
        organizationId: organizations[0].id,
      });
      await get().fetchMembers(teamId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  removeMember: async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    try {
      // Note: removeMember method doesn't exist in the current API
      // This would need to be implemented in the backend
      console.warn('removeMember method not implemented in current API');
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  // Message actions
  fetchMessages: async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set({ loadingMessages: true, error: null });
    try {
      // Note: getChannelMessages method doesn't exist in the current API
      // This would need to be implemented in the backend
      console.warn('getChannelMessages method not implemented in current API');
      set({ messages: [], loadingMessages: false });
    } catch (error: any) {
      set({ error: error.message, loadingMessages: false });
    }
  },

  // Utility actions
  clearError: () => set({ error: null }),
  reset: () =>
    set({
      currentTeam: null,
      teams: [],
      currentChannel: null,
      channels: [],
      members: [],
      messages: [],
      loadingTeams: false,
      loadingChannels: false,
      loadingMessages: false,
      loadingMembers: false,
      error: null,
    }),
});
