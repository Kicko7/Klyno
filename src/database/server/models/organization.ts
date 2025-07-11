import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { LobeChatDatabase } from '@/database/type';

import {
  NewOrganization,
  NewOrganizationMember,
  NewTeam,
  NewTeamChannel,
  NewTeamMember,
  OrganizationItem,
  TeamChannelItem,
  TeamItem,
  organizationMembers,
  organizations,
  teamChannels,
  teamMembers,
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
    const name = params.name || 'New Organization';
    const slug = params.slug || name.toLowerCase().replaceAll(/\s+/g, '-') || id;

    const [organization] = await this.db
      .insert(organizations)
      .values({
        id,
        name,
        ownerId: this.userId,
        slug,
        ...params,
      })
      .returning();

    // Add owner as organization member
    await this.db.insert(organizationMembers).values({
      id: nanoid(),
      organizationId: id,
      permissions: {
        canInviteMembers: true,
        canManageBilling: true,
        canManageSettings: true,
        canManageTeams: true,
      },
      role: 'owner',
      userId: this.userId,
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
      memberPermissions: org.member.permissions,
      memberRole: org.member.role,
    }));
  }

  async getOrganization(id: string) {
    const [result] = await this.db
      .select({
        memberCount: sql<number>`count(distinct ${organizationMembers.userId})`,
        organization: organizations,
        teamCount: sql<number>`count(distinct ${teams.id})`,
      })
      .from(organizations)
      .leftJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
      .leftJoin(teams, eq(organizations.id, teams.organizationId))
      .where(eq(organizations.id, id))
      .groupBy(organizations.id);

    return result;
  }

  async updateOrganization(id: string, updates: Partial<OrganizationItem>) {
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
      id: m.member.id,
      isActive: m.member.isActive,
      permissions: m.member.permissions,
      role: m.member.role,
      user: {
        avatar: m.user.avatar,
        email: m.user.email,
        fullName: m.user.fullName,
        id: m.user.id,
        username: m.user.username,
      },
      userId: m.member.userId,
    }));
  }

  async addOrganizationMember(params: Partial<NewOrganizationMember>) {
    if (!params.userId || !params.organizationId) {
      throw new Error('userId and organizationId are required');
    }

    const [member] = await this.db
      .insert(organizationMembers)
      .values({
        id: nanoid(),
        organizationId: params.organizationId,
        role: params.role || 'member',
        userId: params.userId,
        ...params,
      })
      .returning();

    return member;
  }

  async removeOrganizationMember(organizationId: string, memberId: string) {
    await this.db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.id, memberId),
        ),
      );
  }

  // Team methods
  async createTeam(params: Partial<NewTeam>) {
    if (!params.organizationId) {
      throw new Error('organizationId is required');
    }

    const id = nanoid();
    const name = params.name || 'New Team';
    const slug = params.slug || name.toLowerCase().replaceAll(/\s+/g, '-') || id;

    const [team] = await this.db
      .insert(teams)
      .values({
        id,
        name,
        organizationId: params.organizationId,
        slug,
        ...params,
      })
      .returning();

    // Create default general channel
    await this.db.insert(teamChannels).values({
      description: 'General team discussions',
      id: nanoid(),
      name: 'General',
      teamId: id,
      type: 'general',
    });

    return team;
  }

  async getOrganizationTeams(organizationId: string) {
    const teamsWithMembers = await this.db
      .select({
        memberCount: sql<number>`count(distinct ${teamMembers.userId})`,
        team: teams,
      })
      .from(teams)
      .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teams.organizationId, organizationId))
      .groupBy(teams.id);

    return teamsWithMembers;
  }

  async getTeam(teamId: string) {
    const [team] = await this.db
      .select({
        memberCount: sql<number>`count(distinct ${teamMembers.userId})`,
        organization: organizations,
        team: teams,
      })
      .from(teams)
      .innerJoin(organizations, eq(teams.organizationId, organizations.id))
      .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teams.id, teamId))
      .groupBy(teams.id, organizations.id);

    return team;
  }

  async updateTeam(teamId: string, updates: Partial<TeamItem>) {
    const [updated] = await this.db
      .update(teams)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId))
      .returning();

    return updated;
  }

  async deleteTeam(teamId: string) {
    await this.db.delete(teams).where(eq(teams.id, teamId));
  }

  // Team member methods
  async getTeamMembers(teamId: string) {
    const members = await this.db
      .select({
        member: teamMembers,
        user: users,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return members.map((m) => ({
      createdAt: m.member.createdAt,
      id: m.member.id,
      isActive: m.member.isActive,
      lastSeenAt: m.member.lastSeenAt,
      permissions: m.member.permissions,
      role: m.member.role,
      user: {
        avatar: m.user.avatar,
        email: m.user.email,
        fullName: m.user.fullName,
        id: m.user.id,
        username: m.user.username,
      },
      userId: m.member.userId,
    }));
  }

  async addTeamMember(params: Partial<NewTeamMember>) {
    if (!params.userId || !params.teamId) {
      throw new Error('userId and teamId are required');
    }

    const [member] = await this.db
      .insert(teamMembers)
      .values({
        id: nanoid(),
        role: params.role || 'member',
        teamId: params.teamId,
        userId: params.userId,
        ...params,
      })
      .returning();

    return member;
  }

  async removeTeamMember(teamId: string, memberId: string) {
    await this.db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.id, memberId)));
  }

  // Team channel methods
  async createTeamChannel(params: Partial<NewTeamChannel>) {
    if (!params.teamId) {
      throw new Error('teamId is required');
    }

    const [channel] = await this.db
      .insert(teamChannels)
      .values({
        id: nanoid(),
        name: params.name || 'New Channel',
        teamId: params.teamId,
        type: params.type || 'general',
        ...params,
      })
      .returning();

    return channel;
  }

  async getTeamChannels(teamId: string) {
    return this.db
      .select()
      .from(teamChannels)
      .where(and(eq(teamChannels.teamId, teamId), eq(teamChannels.isArchived, false)));
  }

  async updateTeamChannel(channelId: string, updates: Partial<TeamChannelItem>) {
    const [updated] = await this.db
      .update(teamChannels)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(teamChannels.id, channelId))
      .returning();

    return updated;
  }

  async deleteTeamChannel(channelId: string) {
    await this.db.delete(teamChannels).where(eq(teamChannels.id, channelId));
  }

  // Helper methods
  async isUserOrganizationMember(organizationId: string, userId: string = this.userId) {
    const member = await this.db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.isActive, true),
      ),
    });

    return !!member;
  }

  async isUserTeamMember(teamId: string, userId: string = this.userId) {
    const member = await this.db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.isActive, true),
      ),
    });

    return !!member;
  }

  async getUserTeams(userId: string = this.userId) {
    const userTeams = await this.db
      .select({
        member: teamMembers,
        organization: organizations,
        team: teams,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .innerJoin(organizations, eq(teams.organizationId, organizations.id))
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.isActive, true)));

    return userTeams.map((t) => ({
      ...t.team,
      memberPermissions: t.member.permissions,
      memberRole: t.member.role,
      organization: t.organization,
    }));
  }
}
