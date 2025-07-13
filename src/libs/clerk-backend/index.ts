import { createClerkClient } from '@clerk/nextjs/server';

// Create a singleton Clerk client for backend operations
export const clerkBackend = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// Helper functions for common operations
export const clerkHelpers = {
  // Organization operations
  async createOrganization(params: {
    name: string;
    slug?: string;
    createdBy: string;
    publicMetadata?: Record<string, any>;
  }) {
    return clerkBackend.organizations.createOrganization({
      name: params.name,
      slug: params.slug,
      createdBy: params.createdBy,
      publicMetadata: params.publicMetadata,
    });
  },

  async getOrganization(organizationId: string) {
    return clerkBackend.organizations.getOrganization({
      organizationId,
    });
  },

  async updateOrganization(organizationId: string, params: {
    name?: string;
    slug?: string;
    publicMetadata?: Record<string, any>;
  }) {
    return clerkBackend.organizations.updateOrganization(organizationId, params);
  },

  async deleteOrganization(organizationId: string) {
    return clerkBackend.organizations.deleteOrganization(organizationId);
  },

  // Invitation operations
  async createOrganizationInvitation(params: {
    organizationId: string;
    emailAddress: string;
    role: string;
    redirectUrl?: string;
    publicMetadata?: Record<string, any>;
    inviterUserId?: string;
  }) {
    return clerkBackend.organizations.createOrganizationInvitation({
      organizationId: params.organizationId,
      inviterUserId: params.inviterUserId, // Pass the actual inviter user ID
      emailAddress: params.emailAddress,
      role: params.role,
      redirectUrl: params.redirectUrl,
      publicMetadata: params.publicMetadata,
    });
  },

  async revokeOrganizationInvitation(params: {
    organizationId: string;
    invitationId: string;
    requestingUserId?: string;
  }) {
    return clerkBackend.organizations.revokeOrganizationInvitation({
      organizationId: params.organizationId,
      invitationId: params.invitationId,
      requestingUserId: params.requestingUserId,
    });
  },

  async getOrganizationInvitationList(organizationId: string) {
    return clerkBackend.organizations.getOrganizationInvitationList({
      organizationId,
    });
  },

  // Membership operations
  async createOrganizationMembership(params: {
    organizationId: string;
    userId: string;
    role: string;
  }) {
    return clerkBackend.organizations.createOrganizationMembership({
      organizationId: params.organizationId,
      userId: params.userId,
      role: params.role,
    });
  },

  async updateOrganizationMembership(params: {
    organizationId: string;
    userId: string;
    role: string;
  }) {
    return clerkBackend.organizations.updateOrganizationMembership({
      organizationId: params.organizationId,
      userId: params.userId,
      role: params.role,
    });
  },

  async deleteOrganizationMembership(params: {
    organizationId: string;
    userId: string;
  }) {
    return clerkBackend.organizations.deleteOrganizationMembership({
      organizationId: params.organizationId,
      userId: params.userId,
    });
  },

  async getOrganizationMembershipList(organizationId: string) {
    return clerkBackend.organizations.getOrganizationMembershipList({
      organizationId,
    });
  },

  // User operations
  async getUserByEmail(email: string) {
    const users = await clerkBackend.users.getUserList({
      emailAddress: [email],
    });
    return users.data[0] || null;
  },

  async getUser(userId: string) {
    return clerkBackend.users.getUser(userId);
  },
};
