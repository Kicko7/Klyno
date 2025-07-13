import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { LobeChatDatabase } from '@/database/type';

import {
  NewOrganization,
  NewOrganizationInvitation,
  NewOrganizationMember,
  NewTeam,
  Organization,
  organizationInvitations,
  organizationMembers,
  organizations,
  teams,
} from '../../schemas/organization';
import { users } from '../../schemas/user';

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
      .select({
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
  async createTeam(params: NewTeam) {
    const [team] = await this.db
      .insert(teams)
      .values({
        ...params,
        organizationId: params.organizationId,
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

      // Update invitation status to accepted
      await tx
        .update(organizationInvitations)
        .set({ status: 'accepted' })
        .where(eq(organizationInvitations.id, invitation.id));

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
}
