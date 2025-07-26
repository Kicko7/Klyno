import { z } from 'zod';

import { TeamChatService } from '@/services/teamChatService';
import { TeamChatItem } from '@/database/schemas/teamChat';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';

const teamChatProcedure = authedProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx: {
      teamChatService: new TeamChatService(ctx.serverDB, ctx.userId),
    },
  });
});

export const teamChatRouter = router({
  createTeamChat: teamChatProcedure
    .input(z.object({
      organizationId: z.string(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const teamChat = await ctx.teamChatService.createTeamChat({
        organizationId: input.organizationId,
        title: input.title ?? 'Team Chat',
        description: `Team chat for organization ${input.organizationId}`,
        metadata: { teamMembers: [] },
      });
      return teamChat.id;
    }),

  updateTeamChat: teamChatProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      const updatedChat = await ctx.teamChatService.updateTeamChat(id, updateData);
      return updatedChat;
    }),

  deleteTeamChat: teamChatProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.teamChatService.deleteTeamChat(input.id);
      return { success: true };
    }),

  getTeamChatsByOrganization: teamChatProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const teamChats = await ctx.teamChatService.getChatsByOrganization(input.organizationId);
      return teamChats;
    }),

  addMessage: teamChatProcedure
    .input(z.object({
      teamChatId: z.string(),
      content: z.string(),
      messageType: z.enum(['user', 'assistant', 'system']).default('user'),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.teamChatService.addMessageToChat(input.teamChatId, {
        content: input.content,
        messageType: input.messageType,
        metadata: input.metadata || {},
      });
      return message;
    }),

  getMessages: teamChatProcedure
    .input(z.object({ 
      teamChatId: z.string(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const messages = await ctx.teamChatService.getMessages(input.teamChatId, input.limit);
      return messages;
    }),
});

export type TeamChatRouter = typeof teamChatRouter;

