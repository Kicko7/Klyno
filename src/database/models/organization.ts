import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { LobeChatDatabase } from '@/database/type';

import {
  NewOrganization,
  NewOrganizationInvitation,
  NewOrganizationMember,
  NewTeam,
  NewTeamMember,
  Organization,
  organizationInvitations,
  organizationMembers,
  organizations,
  teamMembers,
  teams,
} from '../schemas/organization';
import { users } from '../schemas/user';
import { lambdaClient } from '@/libs/trpc/client';
import { SubscriptionManager } from '@/server/services/subscriptions/subscriptionManager';
import { StripeCheckoutService } from '@/server/services/stripe/checkout';

export class OrganizationModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  // Organization methods
  async createOrganization(params: Partial<NewOrganization>) {
    const id = nanoid();

    return this.db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          id,
          name: params.name || 'New Organization',
          ownerId: this.userId,
          ...params,
        })
        .returning();

      // Add owner as organization member
      await tx.insert(organizationMembers).values({
        id: nanoid(),
        organizationId: id,
        role: 'owner',
        userId: this.userId,
        teamIds: [],
      });

      return organization;
    });
  }
  async getOrganization(id: string) {
    const organization = await this.db.query.organizations.findFirst({
      where: (organizations, { eq }) => eq(organizations.id, id),
    });
    return organization;
  }
  async getUserOrganizations() {
    const userOrgs = await this.db
      .selectDistinctOn([organizations.id], {
        member: organizationMembers,
        organization: organizations,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, this.userId));
    return userOrgs.map((org) => ({
      ...org.organization,
      memberRole: org.member.role,
    }));
  }
  async createTeam(params: NewTeam & { organizerId: string }) {
    const [team] = await this.db
      .insert(teams)
      .values({
        ...params,
        organizationId: params.organizationId,
        organizerId: params.organizerId,
        teamMembers: [params.organizerId],
      })
      .returning();
    return team;
  }

  async updateOrganization(id: string, updates: Partial<Organization>) {
    const [updated] = await this.db
      .update(organizations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();

    return updated;
  }

  async deleteOrganization(id: string) {
    await this.db.delete(organizations).where(eq(organizations.id, id));
  }

  // Organization member methods
  async getOrganizationMembers(organizationId: string) {
    const members = await this.db
      .select({
        member: organizationMembers,
        user: users,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));

    return members.map((m) => ({
      createdAt: m.member.createdAt,
      email: m.user.email,
      id: m.member.id,
      name: m.user.fullName,
      role: m.member.role,
      userId: m.user.id,
    }));
  }

  async addOrganizationMember(params: NewOrganizationMember) {
    const [newMember] = await this.db.insert(organizationMembers).values(params).returning();
    return newMember;
  }

  async addTeamMember(params: NewTeamMember) {
    const [newMember] = await this.db.insert(teamMembers).values(params).returning();
    return newMember;
  }

  async addUserToTeamMembersArray(teamId: string, userId: string) {
    const team = await this.db.query.teams.findFirst({
      where: (teams, { eq }) => eq(teams.id, teamId),
    });

    if (team) {
      const updatedMembers = [...team.teamMembers, userId];
      await this.db.update(teams).set({ teamMembers: updatedMembers }).where(eq(teams.id, teamId));
    }
  }

  async removeOrganizationMember(organizationId: string, memberId: string) {
    const member = await this.db.query.organizationMembers.findFirst({
      where: (m, { and, eq }) => and(eq(m.organizationId, organizationId), eq(m.userId, memberId)),
    });

    if (!member) {
      throw new Error('Member not found in the organization.');
    }

    const currentUserMember = await this.db.query.organizationMembers.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.organizationId, organizationId), eq(m.userId, this.userId)),
    });

    if (!currentUserMember) {
      throw new Error('Current user is not a member of the organization.');
    }

    if (
      (currentUserMember.role !== 'owner' && currentUserMember.role !== 'admin') ||
      member.role === 'owner'
    ) {
      throw new Error('Current user does not have permission to remove this member.');
    }

    return this.db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, memberId),
        ),
      );
  }

  async createInvitation(params: NewOrganizationInvitation) {
    const [invitation] = await this.db.insert(organizationInvitations).values(params).returning();
    return invitation;
  }

  async getPendingInvitations(userId: string) {
    const organizationId = await this.db.query.organizationMembers.findFirst({
      where: (members, { eq }) => eq(members.userId, userId),
    });

    if (organizationId) {
      return this.db.query.organizationInvitations.findMany({
        where: (invitations, { and, eq, gt }) =>
          and(
            eq(invitations.organizationId, organizationId.organizationId),
            eq(invitations.status, 'pending'),
            gt(invitations.expiresAt, new Date()),
          ),
      });
    }
    return [];
  }

  async acceptInvitation(token: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.token, token));

      if (!invitation) {
        return null;
      }

      // Check existing members
      const existingMembers = await this.db.query.organizationMembers.findMany({
        where: (organizationMembers, { eq }) =>
          eq(organizationMembers.organizationId, invitation.organizationId)
      });

      if (existingMembers.length > 0) {
        const subscriptionService = new StripeCheckoutService()
        if (!process.env.STRIPE_ADDITIONAL_USER_PRICE_ID) {
          throw new Error('STRIPE_ADDITIONAL_USER_PRICE_ID is not set');
        }
        await subscriptionService.handleMetredBilling(userId, process.env.STRIPE_ADDITIONAL_USER_PRICE_ID);
      }

      // Check if user is already a member
      const existingMember = existingMembers.find(member => member.userId === userId);
      if (existingMember) {
        // User is already a member, just update invitation status
        await tx
          .update(organizationInvitations)
          .set({ status: 'accepted' })
          .where(eq(organizationInvitations.id, invitation.id));

        return existingMember;
      }

      // Update invitation status to accepted
      await tx
        .update(organizationInvitations)
        .set({ status: 'accepted' })
        .where(eq(organizationInvitations.id, invitation.id));

      // Add user to organization members
      const [newMember] = await tx
        .insert(organizationMembers)
        .values({
          id: nanoid(),
          organizationId: invitation.organizationId,
          role: invitation.role,
          userId,
          teamIds: invitation.teamId ? [invitation.teamId] : [],
        })
        .returning();

      // If there's a team, add user to the team members table as well
      if (invitation.teamId) {
        await tx.insert(teamMembers).values({
          id: nanoid(),
          organizationId: invitation.organizationId,
          teamId: invitation.teamId,
          userId,
          role: invitation.role,
        });

        // Update the teams.teamMembers array
        const team = await tx.query.teams.findFirst({
          where: (teams, { eq }) => eq(teams.id, invitation.teamId!),
        });

        if (team) {
          const updatedMembers = [...team.teamMembers, userId];
          await tx
            .update(teams)
            .set({ teamMembers: updatedMembers })
            .where(eq(teams.id, invitation.teamId));
        }
      }

      return newMember;
    });
  }

  async declineInvitation(token: string) {
    return this.db.transaction(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.token, token));

      if (!invitation) {
        return null;
      }

      // Update invitation status to declined
      await tx
        .update(organizationInvitations)
        .set({ status: 'declined' })
        .where(eq(organizationInvitations.id, invitation.id));

      return invitation;
    });
  }

  async dismissInvitation(token: string) {
    return this.db.transaction(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.token, token));

      if (!invitation) {
        return null;
      }

      // Update invitation status to dismissed
      await tx
        .update(organizationInvitations)
        .set({ status: 'dismissed' })
        .where(eq(organizationInvitations.id, invitation.id));

      return invitation;
    });
  }

  async isUserOrganizationMember(organizationId: string, userId: string = this.userId) {
    const [member] = await this.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      );

    return !!member;
  }
  async getOrganizationTeams(organizationId: string) {
    const teams = await this.db.query.teams.findMany({
      where: (teams, { eq }) => eq(teams.organizationId, organizationId),
    });
    return teams;
  }

  async getTeamById(teamId: string) {
    const team = await this.db.query.teams.findFirst({
      where: (teams, { eq }) => eq(teams.id, teamId),
    });
    return team;
  }

  async getTeamMembers(teamId: string) {
    const members = await this.db.query.teamMembers.findMany({
      where: (teamMembers, { eq }) => eq(teamMembers.teamId, teamId),
    });
    return members;
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.db.query.organizationInvitations.findFirst({
      where: (invitations, { eq }) => eq(invitations.token, token),
    });
    return invitation;
  }

  async getTeamByJoinCode(teamJoinCode: string) {
    const team = await this.db.query.teams.findFirst({
      where: (teams, { eq }) => eq(teams.teamJoinCode, teamJoinCode),
    });
    return team;
  }

  async findUserByEmail(email: string) {
    const user = await this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });
    return user;
  }

  async isUserTeamMember(teamId: string, userId: string) {
    const member = await this.db.query.teamMembers.findFirst({
      where: (teamMembers, { and, eq }) =>
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
    });
    return !!member;
  }
  async getOrganizationById(organizationId: string) {
    const organization = await this.db.query.organizations.findFirst({
      where: (organizations, { eq }) => eq(organizations.id, organizationId),
    });
    return organization;
  }
}
