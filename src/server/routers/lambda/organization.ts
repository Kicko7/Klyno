import { z } from 'zod';

import { authedProcedure, router } from '@/libs/trpc';
import { OrganizationService } from '@/server/services/organization';

const organizationProcedure = authedProcedure.use(async (opts) => {
  const { ctx } = opts;
  
  return opts.next({
    ctx: {
      organizationService: new OrganizationService(ctx.userId),
    },
  });
});

export const organizationRouter = router({
  // Create a new organization
  createOrganization: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        slug: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.createOrganization(input);
    }),

  // Get user's organizations
  getMyOrganizations: organizationProcedure.query(async ({ ctx }) => {
    return ctx.organizationService.getUserOrganizations();
  }),

  // Get specific organization
  getOrganization: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getOrganization(input.id);
    }),

  // Update organization
  updateOrganization: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        settings: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.updateOrganization(input.id, input);
    }),

  // Delete organization
  deleteOrganization: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.deleteOrganization(input.id);
    }),

  // Organization members
  getOrganizationMembers: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getOrganizationMembers(input.organizationId);
    }),

  addOrganizationMember: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().email(),
        role: z.enum(['admin', 'member']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.addMember(input);
    }),

  removeOrganizationMember: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.removeMember(input.organizationId, input.memberId);
    }),

  // Teams
  createTeam: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        slug: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.createTeam(input);
    }),

  getOrganizationTeams: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getOrganizationTeams(input.organizationId);
    }),

  getTeam: organizationProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getTeam(input.teamId);
    }),

  updateTeam: organizationProcedure
    .input(
      z.object({
        teamId: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        settings: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, ...updates } = input;
      return ctx.organizationService.updateTeam(teamId, updates);
    }),

  deleteTeam: organizationProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.deleteTeam(input.teamId);
    }),

  // Team members
  getTeamMembers: organizationProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getTeamMembers(input.teamId);
    }),

  addTeamMember: organizationProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
        role: z.enum(['leader', 'moderator', 'member']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.addTeamMember(input);
    }),

  removeTeamMember: organizationProcedure
    .input(
      z.object({
        teamId: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.removeTeamMember(input.teamId, input.memberId);
    }),

  // Team channels
  createTeamChannel: organizationProcedure
    .input(
      z.object({
        teamId: z.string(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(['general', 'announcement', 'project', 'random']).default('general'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.createTeamChannel(input);
    }),

  getTeamChannels: organizationProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getTeamChannels(input.teamId);
    }),
});
