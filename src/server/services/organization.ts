import { OrganizationModel } from '@/database/server/models/organization';
import { serverDB } from '@/database/server';

export class OrganizationService {
  private organizationModel: OrganizationModel;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.organizationModel = new OrganizationModel(serverDB, userId);
  }

  async createOrganization(params: { name: string; slug?: string; description?: string }) {
    return this.organizationModel.createOrganization(params);
  }

  async getUserOrganizations() {
    return this.organizationModel.getUserOrganizations();
  }

  async getOrganization(id: string) {
    return this.organizationModel.getOrganization(id);
  }

  async updateOrganization(id: string, updates: { name?: string; description?: string }) {
    return this.organizationModel.updateOrganization(id, updates);
  }

  async deleteOrganization(id: string) {
    return this.organizationModel.deleteOrganization(id);
  }

  async getOrganizationMembers(organizationId: string) {
    return this.organizationModel.getOrganizationMembers(organizationId);
  }

  async addMember(params: { organizationId: string; email: string; role: 'admin' | 'member' }) {
    return this.organizationModel.addOrganizationMember({ ...params });
  }

  async removeMember(organizationId: string, memberId: string) {
    return this.organizationModel.removeOrganizationMember(organizationId, memberId);
  }

  async createTeam(params: {
    organizationId: string;
    name: string;
    slug?: string;
    description?: string;
  }) {
    return this.organizationModel.createTeam(params);
  }

  async getOrganizationTeams(organizationId: string) {
    return this.organizationModel.getOrganizationTeams(organizationId);
  }

  async getTeam(teamId: string) {
    return this.organizationModel.getTeam(teamId);
  }

  async updateTeam(teamId: string, updates: { name?: string; description?: string }) {
    return this.organizationModel.updateTeam(teamId, updates);
  }

  async deleteTeam(teamId: string) {
    return this.organizationModel.deleteTeam(teamId);
  }

  async getTeamMembers(teamId: string) {
    return this.organizationModel.getTeamMembers(teamId);
  }

  async addTeamMember(params: {
    teamId: string;
    userId: string;
    role: 'leader' | 'moderator' | 'member';
  }) {
    return this.organizationModel.addTeamMember(params);
  }

  async removeTeamMember(teamId: string, memberId: string) {
    return this.organizationModel.removeTeamMember(teamId, memberId);
  }

  async createTeamChannel(params: {
    teamId: string;
    name: string;
    description?: string;
    type?: string;
  }) {
    return this.organizationModel.createTeamChannel(params);
  }

  async getTeamChannels(teamId: string) {
    return this.organizationModel.getTeamChannels(teamId);
  }
}

