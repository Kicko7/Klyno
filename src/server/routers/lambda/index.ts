/**
 * This file contains the root router of Lobe Chat tRPC-backend
 */
import { publicProcedure, router } from '@/libs/trpc/lambda';

import { agentRouter } from './agent';
import { aiModelRouter } from './aiModel';
import { aiProviderRouter } from './aiProvider';
import { chunkRouter } from './chunk';
import { configRouter } from './config';
import { documentRouter } from './document';
import { exporterRouter } from './exporter';
import { fileRouter } from './file';
import { importerRouter } from './importer';
import { knowledgeBaseRouter } from './knowledgeBase';
import { marketRouter } from './market';
import { messageRouter } from './message';
import { organizationRouter } from './organization';
import { pluginRouter } from './plugin';
import { ragEvalRouter } from './ragEval';
import { sessionRouter } from './session';
import { sessionGroupRouter } from './sessionGroup';
import { stripeRouter } from './stripe';
import { subscriptionRouter } from './subscription';
import { teamChatRouter } from './teamChat';
import { threadRouter } from './thread';
import { topicRouter } from './topic';
import { userRouter } from './user';
import { sharedFolderRouter } from './sharedFolder';

export const lambdaRouter = router({
  agent: agentRouter,
  aiModel: aiModelRouter,
  aiProvider: aiProviderRouter,
  chunk: chunkRouter,
  config: configRouter,
  document: documentRouter,
  exporter: exporterRouter,
  file: fileRouter,
  healthcheck: publicProcedure.query(() => "i'm live!"),
  importer: importerRouter,
  knowledgeBase: knowledgeBaseRouter,
  market: marketRouter,
  message: messageRouter,
  organization: organizationRouter,
  plugin: pluginRouter,
  ragEval: ragEvalRouter,
  session: sessionRouter,
  sessionGroup: sessionGroupRouter,
  stripe: stripeRouter,
  subscription: subscriptionRouter,
  teamChat: teamChatRouter,
  thread: threadRouter,
  topic: topicRouter,
  user: userRouter,
  sharedFolder:sharedFolderRouter
});

export type LambdaRouter = typeof lambdaRouter;
