import { z } from 'zod';

import { OrganizationModel } from '@/database/models/organization';
import { TeamChatItem } from '@/database/schemas/teamChat';
import { idGenerator } from '@/database/utils/idGenerator';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { CreditManager } from '@/server/services/credits/creditManager';
import { UsageTracker } from '@/server/services/usage/usageTracker';
import { TeamChatService } from '@/services/teamChatService';
import type { ModelTokensUsage } from '@/types/message';
import { calculateMessageCredits } from '@/utils/creditCalculation';

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
    .input(
      z.object({
        organizationId: z.string(),
        title: z.string().optional(),
        userId: z.string().optional(), // Optional since we get it from context
        metadata: z.record(z.any()).optional(),
        isInFolder:z.boolean().default(false).optional(),
        isPublic:z.boolean().default(false).optional()
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const teamChat = await ctx.teamChatService.createTeamChat({
        organizationId: input.organizationId,
        title: input.title ?? 'Team Chat',
        description: `Team chat for organization ${input.organizationId}`,
        metadata: {
          memberAccess: [
            {
              userId: ctx.userId,
              role: 'owner' as const,
              addedAt: new Date().toISOString(),
              addedBy: ctx.userId,
            },
          ],
          ...(input.metadata || {}),
        },
        isInFolder:input.isInFolder,
        isPublic:input.isPublic
      });
      return teamChat;
    }),

  updateTeamChat: teamChatProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      const chat = await ctx.teamChatService.getChatById(id);
      if (!chat) throw new Error('Chat not found');

      const updatedChat = await ctx.teamChatService.updateTeamChat(id, {
        ...updateData,
        metadata: {
          ...chat.metadata,
          ...(updateData.metadata || {}),
          memberAccess: chat.metadata?.memberAccess || [],
        },
      });
      return updatedChat;
    }),

  deleteTeamChat: teamChatProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.teamChatService.deleteTeamChat(input.id);
      return { success: true };
    }),

  getTeamChatsByOrganization: teamChatProcedure
    .input(z.object({ organizationId: z.string(), userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const teamChats = await ctx.teamChatService.getChatsByOrganization(input.organizationId);
      return teamChats;
    }),

  addMessage: teamChatProcedure
    .input(
      z.object({
        teamChatId: z.string(),
        content: z.string(),
        messageType: z.enum(['user', 'assistant', 'system']).default('user'),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // If assistant message, enforce credit check and deduction BEFORE persisting the message
      if (input.messageType === 'assistant') {
        const metadata = (input.metadata || {}) as ModelTokensUsage & { redisMessageId?: string };
        const creditsConsumed = calculateMessageCredits('assistant', metadata);

        if (creditsConsumed > 0) {
          console.log('[TeamChat] assistant message credit calc', {
            teamChatId: input.teamChatId,
            creditsConsumed,
            metadata,
          });

          // Resolve organization owner as the payer
          let payerUserId = ctx.userId;
          try {
            const chat = await ctx.teamChatService.getChatById(input.teamChatId);
            if (chat?.organizationId) {
              const orgModel = new OrganizationModel(ctx.serverDB, ctx.userId);
              const org = await orgModel.getOrganization(chat.organizationId);
              if (org?.ownerId) payerUserId = org.ownerId;
            }
          } catch (e) {
            // Fallback to current user if organization lookup fails
            payerUserId = ctx.userId;
          }

          // Pre-allocate a message id for idempotent deduction and DB insert
          const preallocatedMessageId =
            metadata?.redisMessageId || idGenerator('team_chat_messages');
          console.log('[TeamChat] preallocate message id', preallocatedMessageId);

          // Determine final payer: prefer org owner; fallback to sender if owner lacks balance
          const creditManager = new CreditManager();
          let creditDeductionSuccessful = false;

          try {
            const ownerBalance = await creditManager.getUserBalance(payerUserId);
            if (ownerBalance < creditsConsumed && payerUserId !== ctx.userId) {
              const senderBalance = await creditManager.getUserBalance(ctx.userId);
              if (senderBalance >= creditsConsumed) {
                payerUserId = ctx.userId;
              } else {
                // throw new Error('Insufficient credits');
                alert('Insufficient credits');
              }
            }

            // Deduct credits from payer (idempotent by messageId)
            console.log('[TeamChat] deducting credits', { payerUserId, creditsConsumed });
            await creditManager.consumeCredits(payerUserId, creditsConsumed, {
              messageId: preallocatedMessageId,
              teamChatId: input.teamChatId,
              source: 'team_chat',
            });
            creditDeductionSuccessful = true;
          } catch (e) {
            console.error('[TeamChat] credit deduction failed:', e);
            // Continue with message persistence even if credit deduction fails
            // The message will be persisted but marked as having credit issues
            input.metadata = {
              ...input.metadata,
              creditError: e instanceof Error ? e.message : 'Credit deduction failed',
              creditDeductionFailed: true,
            };
          }
          // Persist assistant message AFTER credit processing (regardless of success/failure)
          const message = await ctx.teamChatService.addMessageToChat(input.teamChatId, {
            id: preallocatedMessageId,
            content: input.content,
            messageType: input.messageType,
            metadata: input.metadata || {},
          });
          console.log('[TeamChat] assistant message persisted', { id: message.id });

          return message;
        }
      }

      // For user/system messages or zero-credit assistant messages, just persist
      const message = await ctx.teamChatService.addMessageToChat(input.teamChatId, {
        content: input.content,
        messageType: input.messageType,
        metadata: input.metadata || {},
      });
      return message;
    }),

  getMessages: teamChatProcedure
    .input(
      z.object({
        teamChatId: z.string(),
        limit: z.number().optional().default(20),
        lastMessageId: z.string().optional(),
        lastMessageCreatedAt: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // Update presence when fetching messages
      // await ctx.teamChatService.updatePresence(input.teamChatId);
      const result = await ctx.teamChatService.getMessages(
        input.teamChatId,
        input.limit,
        input.lastMessageId,
        input.lastMessageCreatedAt,
      );
      return result;
    }),

  // Check for new messages without fetching all messages
  checkNewMessages: teamChatProcedure
    .input(
      z.object({
        teamChatId: z.string(),
        lastMessageId: z.string().optional(),
        lastMessageTimestamp: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.teamChatService.hasNewMessages(
        input.teamChatId,
        input.lastMessageId,
        input.lastMessageTimestamp,
      );
    }),

  // Get active users in a chat
  getActiveUsers: teamChatProcedure
    .input(z.object({ teamChatId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.teamChatService.getActiveUsers(input.teamChatId);
    }),

  // Update user presence
  updatePresence: teamChatProcedure
    .input(
      z.object({
        teamChatId: z.string(),
        lastSeenMessageId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.teamChatService.updatePresence(input.teamChatId, input.lastSeenMessageId);
    }),

  // Mark user as inactive
  markInactive: teamChatProcedure
    .input(z.object({ teamChatId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.teamChatService.markInactive(input.teamChatId);
    }),

  // Get a single team chat by ID
  getTeamChatById: teamChatProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const chat = await ctx.teamChatService.getChatById(input.id);
      return chat;
    }),

  // Update chat access settings
  updateChatAccess: teamChatProcedure
    .input(
      z.object({
        chatId: z.string(),
        isPublic: z.boolean().optional(),
        memberAccess: z
          .array(
            z.object({
              userId: z.string(),
              role: z.enum(['owner', 'admin', 'member']),
              addedAt: z.string(),
              addedBy: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const chat = await ctx.teamChatService.updateChatAccess(input.chatId, {
        isPublic: input.isPublic,
        memberAccess: input.memberAccess,
      });
      return chat;
    }),

  // Add member to chat
  addChatMember: teamChatProcedure
    .input(
      z.object({
        chatId: z.string(),
        userId: z.string(),
        role: z.enum(['admin', 'member']).default('member'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const chat = await ctx.teamChatService.addChatMember(input.chatId, input.userId, input.role);
      return chat;
    }),

  // Remove member from chat
  removeChatMember: teamChatProcedure
    .input(
      z.object({
        chatId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const chat = await ctx.teamChatService.removeChatMember(input.chatId, input.userId);
      return chat;
    }),
  updateMessage: teamChatProcedure
    .input(
      z.object({
        teamChatId: z.string(),
        messageId: z.string(),
        content: z.string(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.teamChatService.updateMessage(
        input.teamChatId,
        input.messageId,
        {
          content: input.content,
          metadata: input.metadata || {},
        },
      );
      return message;
    }),

  deleteMessage: teamChatProcedure
    .input(
      z.object({
        teamChatId: z.string(),
        messageId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.teamChatService.deleteMessage(input.teamChatId, input.messageId);
      return { success: true };
    }),
  updateTeamChatDefaultModels: teamChatProcedure
    .input(z.object({ teamChatId: z.string(), defaultModels: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      const teamChat = await ctx.teamChatService.updateTeamChatDefaultModels(input.teamChatId, input.defaultModels);
      return teamChat;
    }),
  getTeamChatDefaultModels: teamChatProcedure
    .input(z.object({ teamChatId: z.string() }))
    .query(async ({ input, ctx }) => {
      const teamChat = await ctx.teamChatService.getTeamChatDefaultModels(input.teamChatId);
      return teamChat;
    }),
});

export type TeamChatRouter = typeof teamChatRouter;
