import { z } from 'zod';

import { authedProcedure, router } from '@/libs/trpc/lambda';
import { SharedFolderService } from '@/services/sharedFolder';

const sharedFolderProcedure = authedProcedure.use(async (opts) => {
  const { ctx } = opts;
  return opts.next({
    ctx: {
      sharedFolderService: new SharedFolderService(),
    },
  });
});

export const sharedFolderRouter = router({
  createSharedParentFolder: sharedFolderProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        userId: z.string().min(1).max(255),
        organizationId: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sharedFolderService.createParentFolder(input);
    }),

  getMySharedFolders: sharedFolderProcedure
    .input(z.object({ organizationId: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      return ctx.sharedFolderService.getUserSharedFolders(input);
    }),

  createSharedSubFolder: sharedFolderProcedure
    .input(
      z.object({
        parentId: z.string(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sharedFolderService.createSubFolder(input);
    }),

  createChatInSubFolder: sharedFolderProcedure
    .input(
      z.object({
        subFolderId: z.string().min(1),
        teamChatId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.sharedFolderService.createChatSubFolder(input);
    }),
  // getSharedFolderTeamChats: sharedFolderProcedure
  //   .input(z.object({ folderId: z.string().min(1).max(200) }))
  //   .query(async ({ ctx, input }) => {
  //     return ctx.sharedFolderService.getFolderTeamChats(input);
  //   }),
});
