import { z } from 'zod';

import { authedProcedure, router } from '@/libs/trpc/lambda';
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
  // Organization members
  addOrganizationMember: organizationProcedure
    .input(
      z.object({
        email: z.string().email(),
        organizationId: z.string(),
        role: z.enum(['admin', 'member']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.addMember(input);
    }),

  // Team channels
  addTeamMember: organizationProcedure
    .input(
      z.object({
        role: z.enum(['leader', 'moderator', 'member']),
        teamId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.addTeamMember(input);
    }),

  // Create a new organization
  createOrganization: organizationProcedure
    .input(
      z.object({
        description: z.string().optional(),
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.createOrganization(input);
    }),

  // Teams
  createTeam: organizationProcedure
    .input(
      z.object({
        description: z.string().optional(),
        name: z.string().min(1).max(255),
        organizationId: z.string(),
        slug: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.createTeam(input);
    }),

  createTeamChannel: organizationProcedure
    .input(
      z.object({
        description: z.string().optional(),
        name: z.string().min(1).max(255),
        teamId: z.string(),
        type: z.enum(['general', 'announcement', 'project', 'random']).default('general'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.createTeamChannel(input);
    }),

  // Delete organization
  deleteOrganization: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.deleteOrganization(input.id);
    }),

  deleteTeam: organizationProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.deleteTeam(input.teamId);
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

  getOrganizationMembers: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getOrganizationMembers(input.organizationId);
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

  getTeamChannels: organizationProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getTeamChannels(input.teamId);
    }),

  // Team members
  getTeamMembers: organizationProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getTeamMembers(input.teamId);
    }),

  removeOrganizationMember: organizationProcedure
    .input(
      z.object({
        memberId: z.string(),
        organizationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.removeMember(input.organizationId, input.memberId);
    }),

  removeTeamMember: organizationProcedure
    .input(
      z.object({
        memberId: z.string(),
        teamId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.removeTeamMember(input.teamId, input.memberId);
    }),

  // Update organization
  updateOrganization: organizationProcedure
    .input(
      z.object({
        description: z.string().optional(),
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        settings: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.updateOrganization(input.id, input);
    }),

  updateTeam: organizationProcedure
    .input(
      z.object({
        description: z.string().optional(),
        name: z.string().min(1).max(255).optional(),
        settings: z.any().optional(),
        teamId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, ...updates } = input;
      return ctx.organizationService.updateTeam(teamId, updates);
    }),
});
