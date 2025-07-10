import { lambdaClient } from '@/libs/trpc/client';
import { TeamItem } from '@/database/schemas/organization';

export interface IOrganizationService {
  // Organization methods
  createOrganization: (params: { name: string; description?: string; slug?: string }) => Promise<any>;
  getUserOrganizations: () => Promise<any[]>;
  getOrganization: (id: string) => Promise<any>;
  updateOrganization: (id: string, updates: { name?: string; description?: string }) => Promise<any>;
  deleteOrganization: (id: string) => Promise<void>;
  
  // Team methods
  createTeam: (params: {
    organizationId: string;
    name: string;
    description?: string;
    slug?: string;
  }) => Promise<any>;
  getOrganizationTeams: (organizationId: string) => Promise<any[]>;
  getTeam: (teamId: string) => Promise<any>;
  updateTeam: (teamId: string, updates: { name?: string; description?: string }) => Promise<any>;
  deleteTeam: (teamId: string) => Promise<void>;
  
  // Team member methods
  getTeamMembers: (teamId: string) => Promise<any[]>;
  addTeamMember: (params: {
    teamId: string;
    userId: string;
    role: 'leader' | 'moderator' | 'member';
  }) => Promise<any>;
  removeTeamMember: (teamId: string, memberId: string) => Promise<void>;
  
  // Team channel methods
  createTeamChannel: (params: {
    teamId: string;
    name: string;
    description?: string;
    type?: string;
  }) => Promise<any>;
  getTeamChannels: (teamId: string) => Promise<any[]>;
}

export class OrganizationService implements IOrganizationService {
  // Organization methods
  createOrganization = (params: { name: string; description?: string; slug?: string }) => {
    return lambdaClient.organization.createOrganization.mutate(params);
  };

  getUserOrganizations = () => {
    return lambdaClient.organization.getMyOrganizations.query();
  };

  getOrganization = (id: string) => {
    return lambdaClient.organization.getOrganization.query({ id });
  };

  updateOrganization = (id: string, updates: { name?: string; description?: string }) => {
    return lambdaClient.organization.updateOrganization.mutate({ id, ...updates });
  };

  deleteOrganization = (id: string) => {
    return lambdaClient.organization.deleteOrganization.mutate({ id });
  };

  // Team methods
  createTeam = (params: {
    organizationId: string;
    name: string;
    description?: string;
    slug?: string;
  }) => {
    return lambdaClient.organization.createTeam.mutate(params);
  };

  getOrganizationTeams = (organizationId: string) => {
    return lambdaClient.organization.getOrganizationTeams.query({ organizationId });
  };

  getTeam = (teamId: string) => {
    return lambdaClient.organization.getTeam.query({ teamId });
  };

  updateTeam = (teamId: string, updates: { name?: string; description?: string }) => {
    return lambdaClient.organization.updateTeam.mutate({ teamId, ...updates });
  };

  deleteTeam = (teamId: string) => {
    return lambdaClient.organization.deleteTeam.mutate({ teamId });
  };

  // Team member methods
  getTeamMembers = (teamId: string) => {
    return lambdaClient.organization.getTeamMembers.query({ teamId });
  };

  addTeamMember = (params: {
    teamId: string;
    userId: string;
    role: 'leader' | 'moderator' | 'member';
  }) => {
    return lambdaClient.organization.addTeamMember.mutate(params);
  };

  removeTeamMember = (teamId: string, memberId: string) => {
    return lambdaClient.organization.removeTeamMember.mutate({ teamId, memberId });
  };

  // Team channel methods
  createTeamChannel = (params: {
    teamId: string;
    name: string;
    description?: string;
    type?: string;
  }) => {
    return lambdaClient.organization.createTeamChannel.mutate(params);
  };

  getTeamChannels = (teamId: string) => {
    return lambdaClient.organization.getTeamChannels.query({ teamId });
  };
}

export const organizationService = new OrganizationService();
