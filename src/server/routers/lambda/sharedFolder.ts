// import { z } from 'zod';
// import { authedProcedure, router } from '@/libs/trpc/lambda';
// import { SharedFolderService } from '@/services/sharedFolder';

// const sharedFolderProcedure = authedProcedure.use(async (opts) => {
//   const { ctx } = opts;
//   return opts.next({
//     ctx: {
//       sharedFolderService: new SharedFolderService(ctx.userId),
//     },
//   });
// });

// export const sharedFolderRouter = router({
//   createSharedFolder: sharedFolderProcedure
//     .input(z.object({ name: z.string().min(1).max(255) ,userId:z.string().min(1).max(200)}))
//     .mutation(async ({ ctx, input }) => {
//       return ctx.sharedFolderService.createSharedFolder(input);
//     }),

//   getMySharedFolders: sharedFolderProcedure.query(async ({ ctx }) => {
//     return ctx.sharedFolderService.getUserSharedFolders();
//   }),

//   getSharedFolderTeamChats: sharedFolderProcedure
//     .input(z.object({ folderId: z.string() }))
//     .query(async ({ ctx, input }) => {
//       return ctx.sharedFolderService.getFolderTeamChats(input.folderId);
//     }),
// });
