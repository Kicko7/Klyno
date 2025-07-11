import { lambdaClient } from '@/libs/trpc/client';

export interface IOrganizationService {
  // Team member methods
  addTeamMember: (params: {
    role: 'leader' | 'moderator' | 'member';
    teamId: string;
    userId: string;
  }) => Promise<any>;

  // Organization methods
  createOrganization: (params: {
    description?: string;
    name: string;
    slug: string;
  }) => Promise<any>;

  // Team methods
  createTeam: (params: {
    description?: string;
    name: string;
    organizationId: string;
    slug: string;
  }) => Promise<any>;

  // Team channel methods
  createTeamChannel: (params: {
    description?: string;
    name: string;
    teamId: string;
    type?: 'general' | 'announcement' | 'project' | 'random';
  }) => Promise<any>;

  deleteOrganization: (id: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  getOrganization: (id: string) => Promise<any>;
  getOrganizationTeams: (organizationId: string) => Promise<any[]>;
  getTeam: (teamId: string) => Promise<any>;
  getTeamChannels: (teamId: string) => Promise<any[]>;
  getTeamMembers: (teamId: string) => Promise<any[]>;
  getUserOrganizations: () => Promise<any[]>;
  removeTeamMember: (teamId: string, memberId: string) => Promise<void>;
  updateOrganization: (
    id: string,
    updates: { description?: string; name?: string },
  ) => Promise<any>;
  updateTeam: (teamId: string, updates: { description?: string; name?: string }) => Promise<any>;
}

export class OrganizationService implements IOrganizationService {
  // Organization methods
  createOrganization = (params: { description?: string; name: string; slug: string }) => {
    return lambdaClient.organization.createOrganization.mutate(params);
  };

  deleteOrganization = (id: string) => {
    return lambdaClient.organization.deleteOrganization.mutate({ id });
  };

  getOrganization = (id: string) => {
    return lambdaClient.organization.getOrganization.query({ id });
  };

  getUserOrganizations = () => {
    return lambdaClient.organization.getMyOrganizations.query();
  };

  updateOrganization = (id: string, updates: { description?: string; name?: string }) => {
    return lambdaClient.organization.updateOrganization.mutate({ id, ...updates });
  };

  // Team methods
  createTeam = (params: {
    description?: string;
    name: string;
    organizationId: string;
    slug: string;
  }) => {
    return lambdaClient.organization.createTeam.mutate(params);
  };

  deleteTeam = (teamId: string) => {
    return lambdaClient.organization.deleteTeam.mutate({ teamId });
  };

  getOrganizationTeams = (organizationId: string) => {
    return lambdaClient.organization.getOrganizationTeams.query({ organizationId });
  };

  getTeam = (teamId: string) => {
    return lambdaClient.organization.getTeam.query({ teamId });
  };

  updateTeam = (teamId: string, updates: { description?: string; name?: string }) => {
    return lambdaClient.organization.updateTeam.mutate({ teamId, ...updates });
  };

  // Team member methods
  addTeamMember = (params: {
    role: 'leader' | 'moderator' | 'member';
    teamId: string;
    userId: string;
  }) => {
    return lambdaClient.organization.addTeamMember.mutate(params);
  };

  getTeamMembers = (teamId: string) => {
    return lambdaClient.organization.getTeamMembers.query({ teamId });
  };

  removeTeamMember = (teamId: string, memberId: string) => {
    return lambdaClient.organization.removeTeamMember.mutate({ memberId, teamId });
  };

  // Team channel methods
  createTeamChannel = (params: {
    description?: string;
    name: string;
    teamId: string;
    type?: 'general' | 'announcement' | 'project' | 'random';
  }) => {
    return lambdaClient.organization.createTeamChannel.mutate(params);
  };

  getTeamChannels = (teamId: string) => {
    return lambdaClient.organization.getTeamChannels.query({ teamId });
  };
}

export const organizationService = new OrganizationService();
