import { nanoid } from 'nanoid';

import { serverDB } from '@/database/server';
import { OrganizationModel } from '@/database/server/models/organization';
import { sendEmail } from '@/libs/emails/resend';

export class OrganizationService {
  private organizationModel: OrganizationModel;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.organizationModel = new OrganizationModel(serverDB, userId);
  }

  async createOrganization(params: { name: string }) {
    return this.organizationModel.createOrganization(params);
  }

  async getUserOrganizations() {
    return this.organizationModel.getUserOrganizations();
  }

  async getOrganization(id: string) {
    return this.organizationModel.getOrganization(id);
  }

  async updateOrganization(id: string, updates: { name?: string }) {
    return this.organizationModel.updateOrganization(id, updates);
  }

  async deleteOrganization(id: string) {
    return this.organizationModel.deleteOrganization(id);
  }

  async getOrganizationTeams(organizationId: string) {
    return this.organizationModel.getOrganizationTeams(organizationId);
  }

  async getOrganizationMembers(organizationId: string) {
    return this.organizationModel.getOrganizationMembers(organizationId);
  }

  async getPendingInvitations(userId: string) {
    return this.organizationModel.getPendingInvitations(userId);
  }

  async removeMember(organizationId: string, memberId: string) {
    return this.organizationModel.removeOrganizationMember(organizationId, memberId);
  }
  async createTeam(params: {
    description?: string;
    name: string;
    organizationId: string;
    organizerId: string;
  }) {
    return this.organizationModel.createTeam({
      ...params,
      teamMembers: [params.organizerId],
    });
  }
  async getTeamMembers(teamId: string) {
    return this.organizationModel.getTeamMembers(teamId);
  }
  async inviteMember(
    organizationId: string,
    token: string,
    teamId: string,
    email: string,
    role: 'admin' | 'member',
    html?: string,
  ) {
    const organization = await this.getOrganization(organizationId);

    if (!organization) {
      throw new Error('Organization not found');
    }
    // Generate a unique token for the invitation
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.organizationModel.createInvitation({
      email,
      expiresAt,
      id: nanoid(),
      organizationId,
      teamId,
      userId: this.userId,
      role,
      token,
    });

    // Send invitation email

    if (html) {
      await sendEmail({
        html,
        subject: 'You have been invited to an organization on LobeChat',
        to: email,
      });
    }

    return invitation;
  }
  async getTeam(teamId: string) {
    return this.organizationModel.getTeamById(teamId);
  }

  async getInvitationByToken(token: string) {
    return this.organizationModel.getInvitationByToken(token);
  }

  async acceptInvitation(token: string) {
    return this.organizationModel.acceptInvitation(token, this.userId);
  }

  async declineInvitation(token: string) {
    return this.organizationModel.declineInvitation(token);
  }

  async dismissInvitation(token: string) {
    return this.organizationModel.dismissInvitation(token);
  }
}
