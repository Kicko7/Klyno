import { nanoid } from 'nanoid';

import { OrganizationModel } from '@/database/models/organization';
import { NewOrganizationMember, NewTeamMember } from '@/database/schemas/organization';
import { serverDB } from '@/database/server';
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

  async removeMember(organizationId: string, memberId: string,stripeSubscriptionId?: string, stripeCustomerId?: string, interval?: 'month' | 'year') {
    return this.organizationModel.removeOrganizationMember(organizationId, memberId,stripeSubscriptionId, stripeCustomerId, interval);
  }

  async addOrganizationMember(params: NewOrganizationMember) {
    return this.organizationModel.addOrganizationMember(params);
  }

  async addTeamMember(params: NewTeamMember) {
    return this.organizationModel.addTeamMember(params);
  }

  async addUserToTeamMembersArray(teamId: string, userId: string) {
    return this.organizationModel.addUserToTeamMembersArray(teamId, userId);
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

    // Check if user with this email already exists
    const existingUser = await this.organizationModel.findUserByEmail(email);

    if (existingUser) {
      // User exists, check if they're already a member of this team
      const isAlreadyMember = await this.organizationModel.isUserTeamMember(
        teamId,
        existingUser.id,
      );

      if (isAlreadyMember) {
        throw new Error('User is already a member of this team');
      }

      // Check if they're already a member of the organization
      const isOrgMember = await this.organizationModel.isUserOrganizationMember(
        organizationId,
        existingUser.id,
      );

      if (!isOrgMember) {
        // Add user to organization
        await this.addOrganizationMember({
          id: nanoid(),
          organizationId,
          userId: existingUser.id,
          role,
          teamIds: teamId ? [teamId] : [],
        });
      }

      if (teamId) {
        // Add user to the specific team
        await this.addTeamMember({
          id: nanoid(),
          organizationId,
          teamId,
          userId: existingUser.id,
          role,
        });

        // Add user to the team's members array
        await this.addUserToTeamMembersArray(teamId, existingUser.id);
      }

      return {
        message: 'User has been added to the team successfully',
        userAdded: true,
        userId: existingUser.id,
      };
    } else {
      // User doesn't exist, create invitation for when they sign up
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

      return {
        message: 'Invitation sent successfully',
        invitation,
        userAdded: false,
      };
    }
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
  async getTeamByJoinCode(teamJoinCode: string) {
    return this.organizationModel.getTeamByJoinCode(teamJoinCode);
  }

  async addUserToTeam(
    organizationId: string,
    teamId: string,
    userId: string,
    role: 'admin' | 'member',
  ) {
    // Check if user is already a member of this team
    const isAlreadyMember = await this.organizationModel.isUserTeamMember(teamId, userId);

    if (isAlreadyMember) {
      throw new Error('User is already a member of this team');
    }

    // Check if they're already a member of the organization
    const isOrgMember = await this.organizationModel.isUserOrganizationMember(
      organizationId,
      userId,
    );

    if (!isOrgMember) {
      // Add user to organization
      await this.addOrganizationMember({
        id: nanoid(),
        organizationId,
        userId,
        role,
        teamIds: [teamId],
      });
    }

    // Add user to the specific team
    await this.addTeamMember({
      id: nanoid(),
      organizationId,
      teamId,
      userId,
      role,
    });

    // Add user to the team's members array
    await this.addUserToTeamMembersArray(teamId, userId);

    return {
      message: 'User has been added to the team successfully',
      userAdded: true,
      userId,
    };
  }

  async addExistingUserToOrganization(
    organizationId: string,
    userId: string,
    role: 'admin' | 'member',
  ) {
    // Check if user is already a member of the organization
    const isOrgMember = await this.organizationModel.isUserOrganizationMember(
      organizationId,
      userId,
    );

    if (isOrgMember) {
      throw new Error('User is already a member of this organization');
    }

    await this.addOrganizationMember({
      id: nanoid(),
      organizationId,
      userId,
      role,
      teamIds: [],
    });

    return {
      message: 'User has been added to the organization successfully',
      userAdded: true,
      userId,
    };
  }

  async inviteByEmail(
    organizationId: string,
    email: string,
    role: 'admin' | 'member',
    html?: string,
    token?: string,
  ) {
    console.log('Starting inviteByEmail process:', { organizationId, email, role });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const inviteToken = token || nanoid();

    console.log('Creating invitation with token:', token);

    const invitation = await this.organizationModel.createInvitation({
      email,
      expiresAt,
      id: nanoid(),
      organizationId,
      userId: this.userId,
      role,
      token: inviteToken,
    });

    console.log('Invitation created successfully:', invitation.id);

    // Send invitation email if HTML is provided
    if (html) {
      try {
        await sendEmail({
          html,
          subject: 'You have been invited to join an organization on Klynno AI',
          to: email,
        });
        console.log('Invitation email sent successfully to:', email);
      } catch (error) {
        console.error('Failed to send invitation email:', error);

        // If it's a configuration error, provide helpful message
        if (error instanceof Error && error.message.includes('RESEND_API_KEY')) {
          console.warn('Email sending is disabled due to missing RESEND_API_KEY configuration');
          // Still return success since invitation was created
        } else {
          // For other errors, log but don't fail the invitation
          console.error('Email sending failed but invitation was created:', error);
        }
      }
    }

    return {
      message: 'Invitation sent successfully',
      invitation,
    };
  }
  async getOrganizationById(organizationId: string) {
    return this.organizationModel.getOrganizationById(organizationId);
  }

  async updateOrganizationDefaultModels(organizationId: string, defaultModels: string[]) {
    return this.organizationModel.updateOrganizationDefaultModels(organizationId, defaultModels);
  }

  async getDefaultModels(organizationId: string) {
    return this.organizationModel.getDefaultModels(organizationId);
  }
  
}
