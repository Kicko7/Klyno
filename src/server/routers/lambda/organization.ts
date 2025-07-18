import { z } from 'zod';

import { authedProcedure, router } from '@/libs/trpc/lambda';
import { OrganizationService } from '@/server/services/organizations';

const organizationProcedure = authedProcedure.use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx: {
      organizationService: new OrganizationService(ctx.userId),
    },
  });
});

export const organizationRouter = router({
  acceptInvitation: authedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new OrganizationService(ctx.userId);
      return service.acceptInvitation(input.token);
    }),

  declineInvitation: authedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new OrganizationService(ctx.userId);
      return service.declineInvitation(input.token);
    }),

  dismissInvitation: authedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new OrganizationService(ctx.userId);
      return service.dismissInvitation(input.token);
    }),
  createOrganization: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.createOrganization(input);
    }),

  deleteOrganization: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.deleteOrganization(input.id);
    }),

  getMyOrganizations: organizationProcedure.query(async ({ ctx }) => {
    return ctx.organizationService.getUserOrganizations();
  }),

  getOrganization: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getOrganization(input.id);
    }),

  getOrganizationTeams: organizationProcedure

    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getOrganizationTeams(input.organizationId);
    }),
  getTeamById: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getTeam(input.id);
    }),

  getInvitationByToken: organizationProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getInvitationByToken(input.token);
    }),
  getOrganizationMembers: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getOrganizationMembers(input.organizationId);
    }),

  getPendingInvitations: organizationProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getPendingInvitations(input.userId);
    }),
  createTeam: organizationProcedure
    .input(
      z.object({
        description: z.string().optional(),
        name: z.string(),
        organizationId: z.string(),
        organizerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.createTeam(input);
    }),

  inviteMember: organizationProcedure
    .input(
      z.object({
        email: z.string().email(),
        organizationId: z.string(),
        role: z.enum(['admin', 'member']),
        teamId: z.string(),
        html: z.string().optional(),
        token: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.inviteMember(
        input.organizationId,
        input.token,
        input.teamId,
        input.email,
        input.role,
        input.html,
      );
    }),
  getTeamMembers: organizationProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getTeamMembers(input.teamId);
    }),
  removeMember: organizationProcedure
    .input(
      z.object({
        memberId: z.string(),
        organizationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.removeMember(input.organizationId, input.memberId);
    }),

  updateOrganization: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.organizationService.updateOrganization(input.id, { name: input.name });
    }),
  getTeamByJoinCode: organizationProcedure
    .input(
      z.object({
        joinCode: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.organizationService.getTeamByJoinCode(input.joinCode);
    }),
});
