import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm/expressions';

import { LobeChatDatabase } from '@/database/type';
import { users } from '../schemas';
import { klynoUsers, teams, teamMembers, workspaces, workspaceMembers } from '../schemas/klyno';

export class KlynoUserNotFoundError extends TRPCError {
  constructor() {
    super({ code: 'UNAUTHORIZED', message: 'Klyno user not found' });
  }
}

export class KlynoUserModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  // Get Klyno user profile with subscription info
  getKlynoUserProfile = async () => {
    const result = await this.db
      .select({
        // Base user info
        avatar: users.avatar,
        // Klyno specific info
clerkId: klynoUsers.clerkId,
        
createdAt: users.createdAt,
        
email: users.email,
        
firstName: users.firstName,
        
fullName: users.fullName,
        
id: users.id,
        
isOnboarded: users.isOnboarded,
        
lastName: users.lastName,
        
settings: klynoUsers.settings,
        
        
        stripeCustomerId: klynoUsers.stripeCustomerId,
        subscriptionStatus: klynoUsers.subscriptionStatus,
        subscriptionTier: klynoUsers.subscriptionTier,
        updatedAt: users.updatedAt,
        usageCurrent: klynoUsers.usageCurrent,
        usageQuota: klynoUsers.usageQuota,
        username: users.username,
      })
      .from(users)
      .leftJoin(klynoUsers, eq(users.id, klynoUsers.userId))
      .where(eq(users.id, this.userId));

    if (!result || !result[0]) {
      throw new KlynoUserNotFoundError();
    }

    return result[0];
  };

  // Create or update Klyno user profile
  upsertKlynoUser = async (klynoUserData: {
    avatar?: string;
    clerkId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    settings?: any;
    stripeCustomerId?: string;
    subscriptionStatus?: 'active' | 'canceled' | 'past_due';
    subscriptionTier?: 'starter' | 'pro' | 'ultimate';
    usageCurrent?: number;
    usageQuota?: number;
  }) => {
    // Ensure clerkId is provided
    if (!klynoUserData.clerkId) {
      throw new Error('clerkId is required for Klyno user');
    }

    // Explicitly construct the insert object with only allowed fields
    const insertData: typeof klynoUsers.$inferInsert = {
      accessedAt: new Date(),
      clerkId: klynoUserData.clerkId,
      createdAt: new Date(),
      settings: klynoUserData.settings ?? null,
      stripeCustomerId: klynoUserData.stripeCustomerId ?? null,
      subscriptionStatus: klynoUserData.subscriptionStatus ?? null,
      subscriptionTier: klynoUserData.subscriptionTier ?? null,
      updatedAt: new Date(),
      usageCurrent: klynoUserData.usageCurrent ?? null,
      usageQuota: klynoUserData.usageQuota ?? null,
      userId: this.userId,
    };

    return this.db
      .insert(klynoUsers)
      .values(insertData)
      .onConflictDoUpdate({
        set: {
          ...insertData,
          updatedAt: new Date(),
        },
        target: klynoUsers.userId,
      });
  };

  // Update subscription info
  updateSubscription = async (subscriptionData: {
    status?: 'active' | 'canceled' | 'past_due';
    stripeCustomerId?: string;
    tier?: 'starter' | 'pro' | 'ultimate';
  }) => {
    return this.db
      .update(klynoUsers)
      .set({
        ...subscriptionData,
        updatedAt: new Date(),
      })
      .where(eq(klynoUsers.userId, this.userId));
  };

  // Update usage tracking
  updateUsage = async (usageData: {
    current?: number;
    quota?: number;
  }) => {
    return this.db
      .update(klynoUsers)
      .set({
        ...usageData,
        updatedAt: new Date(),
      })
      .where(eq(klynoUsers.userId, this.userId));
  };

  // Get user's teams
  getUserTeams = async () => {
    const result = await this.db
      .select({
        memberJoinedAt: teamMembers.createdAt,
        memberRole: teamMembers.role,
        teamAvatar: teams.avatar,
        teamCreatedAt: teams.createdAt,
        teamDescription: teams.description,
        teamId: teams.id,
        teamName: teams.name,
        teamUpdatedAt: teams.updatedAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, this.userId));

    return result;
  };

  // Get user's workspaces
  getUserWorkspaces = async () => {
    const result = await this.db
      .select({
        memberJoinedAt: workspaceMembers.createdAt,
        memberRole: workspaceMembers.role,
        workspaceAvatar: workspaces.avatar,
        workspaceCreatedAt: workspaces.createdAt,
        workspaceDescription: workspaces.description,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceUpdatedAt: workspaces.updatedAt,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, this.userId));

    return result;
  };

  // Static methods
  static createKlynoUser = async (
    db: LobeChatDatabase,
    params: typeof klynoUsers.$inferInsert,
  ) => {
    return db.insert(klynoUsers).values(params);
  };

  static findKlynoUserByClerkId = async (db: LobeChatDatabase, clerkId: string) => {
    return db.query.klynoUsers.findFirst({
      where: eq(klynoUsers.clerkId, clerkId),
    });
  };

  static findKlynoUserById = async (db: LobeChatDatabase, userId: string) => {
    return db.query.klynoUsers.findFirst({
      where: eq(klynoUsers.userId, userId),
    });
  };
} 