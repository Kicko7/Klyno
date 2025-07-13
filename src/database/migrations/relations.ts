import { relations } from "drizzle-orm/relations";
import { users, agents, asyncTasks, files, documents, globalFiles, messages, messagePlugins, knowledgeBases, messageTts, embeddings, messageQueries, messageTranslates, oidcAccessTokens, oidcAuthorizationCodes, sessions, threads, topics, oidcRefreshTokens, oidcSessions, teams, teamActivityLog, organizations, oidcDeviceCodes, oidcGrants, teamMembers, teamChannels, teamMessages, teamInvitations, chunks, ragEvalDatasets, ragEvalEvaluations, ragEvalEvaluationRecords, unstructuredChunks, sessionGroups, teamMessageReactions, ragEvalDatasetRecords, organizationMembers, userSettings, messageChunks, messagesFiles, agentsToSessions, filesToSessions, rbacPermissions, rbacRolePermissions, rbacRoles, fileChunks, rbacUserRoles, knowledgeBaseFiles, topicDocuments, messageQueryChunks, documentChunks, agentsFiles, agentsKnowledgeBases, oidcClients, oidcConsents, userInstalledPlugins, aiProviders, aiModels } from "./schema";

export const agentsRelations = relations(agents, ({one, many}) => ({
	user: one(users, {
		fields: [agents.userId],
		references: [users.id]
	}),
	messages: many(messages),
	agentsToSessions: many(agentsToSessions),
	agentsFiles: many(agentsFiles),
	agentsKnowledgeBases: many(agentsKnowledgeBases),
}));

export const usersRelations = relations(users, ({many}) => ({
	agents: many(agents),
	asyncTasks: many(asyncTasks),
	documents: many(documents),
	files: many(files),
	messagePlugins: many(messagePlugins),
	knowledgeBases: many(knowledgeBases),
	messageTts: many(messageTts),
	messageQueries: many(messageQueries),
	messageTranslates: many(messageTranslates),
	oidcAccessTokens: many(oidcAccessTokens),
	oidcAuthorizationCodes: many(oidcAuthorizationCodes),
	messages: many(messages),
	oidcRefreshTokens: many(oidcRefreshTokens),
	oidcSessions: many(oidcSessions),
	teamActivityLogs: many(teamActivityLog),
	organizations: many(organizations),
	oidcDeviceCodes: many(oidcDeviceCodes),
	oidcGrants: many(oidcGrants),
	teamMembers: many(teamMembers),
	teamMessages: many(teamMessages),
	teamInvitations: many(teamInvitations),
	chunks: many(chunks),
	ragEvalDatasets: many(ragEvalDatasets),
	ragEvalEvaluations: many(ragEvalEvaluations),
	ragEvalEvaluationRecords: many(ragEvalEvaluationRecords),
	embeddings: many(embeddings),
	unstructuredChunks: many(unstructuredChunks),
	sessionGroups: many(sessionGroups),
	threads: many(threads),
	sessions: many(sessions),
	teamMessageReactions: many(teamMessageReactions),
	ragEvalDatasetRecords: many(ragEvalDatasetRecords),
	globalFiles: many(globalFiles),
	topics: many(topics),
	organizationMembers: many(organizationMembers),
	userSettings: many(userSettings),
	messageChunks: many(messageChunks),
	messagesFiles: many(messagesFiles),
	agentsToSessions: many(agentsToSessions),
	filesToSessions: many(filesToSessions),
	fileChunks: many(fileChunks),
	rbacUserRoles: many(rbacUserRoles),
	knowledgeBaseFiles: many(knowledgeBaseFiles),
	topicDocuments: many(topicDocuments),
	messageQueryChunks: many(messageQueryChunks),
	documentChunks: many(documentChunks),
	agentsFiles: many(agentsFiles),
	agentsKnowledgeBases: many(agentsKnowledgeBases),
	oidcConsents: many(oidcConsents),
	userInstalledPlugins: many(userInstalledPlugins),
	aiProviders: many(aiProviders),
	aiModels: many(aiModels),
}));

export const asyncTasksRelations = relations(asyncTasks, ({one, many}) => ({
	user: one(users, {
		fields: [asyncTasks.userId],
		references: [users.id]
	}),
	files_chunkTaskId: many(files, {
		relationName: "files_chunkTaskId_asyncTasks_id"
	}),
	files_embeddingTaskId: many(files, {
		relationName: "files_embeddingTaskId_asyncTasks_id"
	}),
}));

export const documentsRelations = relations(documents, ({one, many}) => ({
	file: one(files, {
		fields: [documents.fileId],
		references: [files.id]
	}),
	user: one(users, {
		fields: [documents.userId],
		references: [users.id]
	}),
	topicDocuments: many(topicDocuments),
	documentChunks: many(documentChunks),
}));

export const filesRelations = relations(files, ({one, many}) => ({
	documents: many(documents),
	asyncTask_chunkTaskId: one(asyncTasks, {
		fields: [files.chunkTaskId],
		references: [asyncTasks.id],
		relationName: "files_chunkTaskId_asyncTasks_id"
	}),
	asyncTask_embeddingTaskId: one(asyncTasks, {
		fields: [files.embeddingTaskId],
		references: [asyncTasks.id],
		relationName: "files_embeddingTaskId_asyncTasks_id"
	}),
	globalFile: one(globalFiles, {
		fields: [files.fileHash],
		references: [globalFiles.hashId]
	}),
	user: one(users, {
		fields: [files.userId],
		references: [users.id]
	}),
	messageTts: many(messageTts),
	unstructuredChunks: many(unstructuredChunks),
	messagesFiles: many(messagesFiles),
	filesToSessions: many(filesToSessions),
	fileChunks: many(fileChunks),
	knowledgeBaseFiles: many(knowledgeBaseFiles),
	agentsFiles: many(agentsFiles),
}));

export const globalFilesRelations = relations(globalFiles, ({one, many}) => ({
	files: many(files),
	user: one(users, {
		fields: [globalFiles.creator],
		references: [users.id]
	}),
}));

export const messagePluginsRelations = relations(messagePlugins, ({one}) => ({
	message: one(messages, {
		fields: [messagePlugins.id],
		references: [messages.id]
	}),
	user: one(users, {
		fields: [messagePlugins.userId],
		references: [users.id]
	}),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	messagePlugins: many(messagePlugins),
	messageTts: many(messageTts),
	messageQueries: many(messageQueries),
	messageTranslates: many(messageTranslates),
	agent: one(agents, {
		fields: [messages.agentId],
		references: [agents.id]
	}),
	message_parentId: one(messages, {
		fields: [messages.parentId],
		references: [messages.id],
		relationName: "messages_parentId_messages_id"
	}),
	messages_parentId: many(messages, {
		relationName: "messages_parentId_messages_id"
	}),
	message_quotaId: one(messages, {
		fields: [messages.quotaId],
		references: [messages.id],
		relationName: "messages_quotaId_messages_id"
	}),
	messages_quotaId: many(messages, {
		relationName: "messages_quotaId_messages_id"
	}),
	session: one(sessions, {
		fields: [messages.sessionId],
		references: [sessions.id]
	}),
	thread: one(threads, {
		fields: [messages.threadId],
		references: [threads.id]
	}),
	topic: one(topics, {
		fields: [messages.topicId],
		references: [topics.id]
	}),
	user: one(users, {
		fields: [messages.userId],
		references: [users.id]
	}),
	messageChunks: many(messageChunks),
	messagesFiles: many(messagesFiles),
	messageQueryChunks: many(messageQueryChunks),
}));

export const knowledgeBasesRelations = relations(knowledgeBases, ({one, many}) => ({
	user: one(users, {
		fields: [knowledgeBases.userId],
		references: [users.id]
	}),
	ragEvalDatasets: many(ragEvalDatasets),
	ragEvalEvaluations: many(ragEvalEvaluations),
	knowledgeBaseFiles: many(knowledgeBaseFiles),
	agentsKnowledgeBases: many(agentsKnowledgeBases),
}));

export const messageTtsRelations = relations(messageTts, ({one}) => ({
	file: one(files, {
		fields: [messageTts.fileId],
		references: [files.id]
	}),
	message: one(messages, {
		fields: [messageTts.id],
		references: [messages.id]
	}),
	user: one(users, {
		fields: [messageTts.userId],
		references: [users.id]
	}),
}));

export const messageQueriesRelations = relations(messageQueries, ({one, many}) => ({
	embedding: one(embeddings, {
		fields: [messageQueries.embeddingsId],
		references: [embeddings.id]
	}),
	message: one(messages, {
		fields: [messageQueries.messageId],
		references: [messages.id]
	}),
	user: one(users, {
		fields: [messageQueries.userId],
		references: [users.id]
	}),
	messageQueryChunks: many(messageQueryChunks),
}));

export const embeddingsRelations = relations(embeddings, ({one, many}) => ({
	messageQueries: many(messageQueries),
	chunk: one(chunks, {
		fields: [embeddings.chunkId],
		references: [chunks.id]
	}),
	user: one(users, {
		fields: [embeddings.userId],
		references: [users.id]
	}),
}));

export const messageTranslatesRelations = relations(messageTranslates, ({one}) => ({
	message: one(messages, {
		fields: [messageTranslates.id],
		references: [messages.id]
	}),
	user: one(users, {
		fields: [messageTranslates.userId],
		references: [users.id]
	}),
}));

export const oidcAccessTokensRelations = relations(oidcAccessTokens, ({one}) => ({
	user: one(users, {
		fields: [oidcAccessTokens.userId],
		references: [users.id]
	}),
}));

export const oidcAuthorizationCodesRelations = relations(oidcAuthorizationCodes, ({one}) => ({
	user: one(users, {
		fields: [oidcAuthorizationCodes.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	messages: many(messages),
	sessionGroup: one(sessionGroups, {
		fields: [sessions.groupId],
		references: [sessionGroups.id]
	}),
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
	topics: many(topics),
	agentsToSessions: many(agentsToSessions),
	filesToSessions: many(filesToSessions),
}));

export const threadsRelations = relations(threads, ({one, many}) => ({
	messages: many(messages),
	thread: one(threads, {
		fields: [threads.parentThreadId],
		references: [threads.id],
		relationName: "threads_parentThreadId_threads_id"
	}),
	threads: many(threads, {
		relationName: "threads_parentThreadId_threads_id"
	}),
	topic: one(topics, {
		fields: [threads.topicId],
		references: [topics.id]
	}),
	user: one(users, {
		fields: [threads.userId],
		references: [users.id]
	}),
}));

export const topicsRelations = relations(topics, ({one, many}) => ({
	messages: many(messages),
	threads: many(threads),
	session: one(sessions, {
		fields: [topics.sessionId],
		references: [sessions.id]
	}),
	user: one(users, {
		fields: [topics.userId],
		references: [users.id]
	}),
	topicDocuments: many(topicDocuments),
}));

export const oidcRefreshTokensRelations = relations(oidcRefreshTokens, ({one}) => ({
	user: one(users, {
		fields: [oidcRefreshTokens.userId],
		references: [users.id]
	}),
}));

export const oidcSessionsRelations = relations(oidcSessions, ({one}) => ({
	user: one(users, {
		fields: [oidcSessions.userId],
		references: [users.id]
	}),
}));

export const teamActivityLogRelations = relations(teamActivityLog, ({one}) => ({
	team: one(teams, {
		fields: [teamActivityLog.teamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [teamActivityLog.userId],
		references: [users.id]
	}),
}));

export const teamsRelations = relations(teams, ({one, many}) => ({
	teamActivityLogs: many(teamActivityLog),
	teamMembers: many(teamMembers),
	teamInvitations: many(teamInvitations),
	teamChannels: many(teamChannels),
	organization: one(organizations, {
		fields: [teams.organizationId],
		references: [organizations.id]
	}),
}));

export const organizationsRelations = relations(organizations, ({one, many}) => ({
	user: one(users, {
		fields: [organizations.ownerId],
		references: [users.id]
	}),
	teams: many(teams),
	organizationMembers: many(organizationMembers),
}));

export const oidcDeviceCodesRelations = relations(oidcDeviceCodes, ({one}) => ({
	user: one(users, {
		fields: [oidcDeviceCodes.userId],
		references: [users.id]
	}),
}));

export const oidcGrantsRelations = relations(oidcGrants, ({one}) => ({
	user: one(users, {
		fields: [oidcGrants.userId],
		references: [users.id]
	}),
}));

export const teamMembersRelations = relations(teamMembers, ({one}) => ({
	team: one(teams, {
		fields: [teamMembers.teamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [teamMembers.userId],
		references: [users.id]
	}),
}));

export const teamMessagesRelations = relations(teamMessages, ({one, many}) => ({
	teamChannel: one(teamChannels, {
		fields: [teamMessages.channelId],
		references: [teamChannels.id]
	}),
	user: one(users, {
		fields: [teamMessages.senderId],
		references: [users.id]
	}),
	teamMessageReactions: many(teamMessageReactions),
}));

export const teamChannelsRelations = relations(teamChannels, ({one, many}) => ({
	teamMessages: many(teamMessages),
	team: one(teams, {
		fields: [teamChannels.teamId],
		references: [teams.id]
	}),
}));

export const teamInvitationsRelations = relations(teamInvitations, ({one}) => ({
	user: one(users, {
		fields: [teamInvitations.invitedBy],
		references: [users.id]
	}),
	team: one(teams, {
		fields: [teamInvitations.teamId],
		references: [teams.id]
	}),
}));

export const chunksRelations = relations(chunks, ({one, many}) => ({
	user: one(users, {
		fields: [chunks.userId],
		references: [users.id]
	}),
	embeddings: many(embeddings),
	unstructuredChunks: many(unstructuredChunks),
	messageChunks: many(messageChunks),
	fileChunks: many(fileChunks),
	messageQueryChunks: many(messageQueryChunks),
	documentChunks: many(documentChunks),
}));

export const ragEvalDatasetsRelations = relations(ragEvalDatasets, ({one, many}) => ({
	knowledgeBase: one(knowledgeBases, {
		fields: [ragEvalDatasets.knowledgeBaseId],
		references: [knowledgeBases.id]
	}),
	user: one(users, {
		fields: [ragEvalDatasets.userId],
		references: [users.id]
	}),
	ragEvalEvaluations: many(ragEvalEvaluations),
	ragEvalDatasetRecords: many(ragEvalDatasetRecords),
}));

export const ragEvalEvaluationsRelations = relations(ragEvalEvaluations, ({one}) => ({
	ragEvalDataset: one(ragEvalDatasets, {
		fields: [ragEvalEvaluations.datasetId],
		references: [ragEvalDatasets.id]
	}),
	knowledgeBase: one(knowledgeBases, {
		fields: [ragEvalEvaluations.knowledgeBaseId],
		references: [knowledgeBases.id]
	}),
	user: one(users, {
		fields: [ragEvalEvaluations.userId],
		references: [users.id]
	}),
}));

export const ragEvalEvaluationRecordsRelations = relations(ragEvalEvaluationRecords, ({one}) => ({
	user: one(users, {
		fields: [ragEvalEvaluationRecords.userId],
		references: [users.id]
	}),
}));

export const unstructuredChunksRelations = relations(unstructuredChunks, ({one}) => ({
	chunk: one(chunks, {
		fields: [unstructuredChunks.compositeId],
		references: [chunks.id]
	}),
	file: one(files, {
		fields: [unstructuredChunks.fileId],
		references: [files.id]
	}),
	user: one(users, {
		fields: [unstructuredChunks.userId],
		references: [users.id]
	}),
}));

export const sessionGroupsRelations = relations(sessionGroups, ({one, many}) => ({
	user: one(users, {
		fields: [sessionGroups.userId],
		references: [users.id]
	}),
	sessions: many(sessions),
}));

export const teamMessageReactionsRelations = relations(teamMessageReactions, ({one}) => ({
	teamMessage: one(teamMessages, {
		fields: [teamMessageReactions.messageId],
		references: [teamMessages.id]
	}),
	user: one(users, {
		fields: [teamMessageReactions.userId],
		references: [users.id]
	}),
}));

export const ragEvalDatasetRecordsRelations = relations(ragEvalDatasetRecords, ({one}) => ({
	ragEvalDataset: one(ragEvalDatasets, {
		fields: [ragEvalDatasetRecords.datasetId],
		references: [ragEvalDatasets.id]
	}),
	user: one(users, {
		fields: [ragEvalDatasetRecords.userId],
		references: [users.id]
	}),
}));

export const organizationMembersRelations = relations(organizationMembers, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationMembers.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [organizationMembers.userId],
		references: [users.id]
	}),
}));

export const userSettingsRelations = relations(userSettings, ({one}) => ({
	user: one(users, {
		fields: [userSettings.id],
		references: [users.id]
	}),
}));

export const messageChunksRelations = relations(messageChunks, ({one}) => ({
	chunk: one(chunks, {
		fields: [messageChunks.chunkId],
		references: [chunks.id]
	}),
	message: one(messages, {
		fields: [messageChunks.messageId],
		references: [messages.id]
	}),
	user: one(users, {
		fields: [messageChunks.userId],
		references: [users.id]
	}),
}));

export const messagesFilesRelations = relations(messagesFiles, ({one}) => ({
	file: one(files, {
		fields: [messagesFiles.fileId],
		references: [files.id]
	}),
	message: one(messages, {
		fields: [messagesFiles.messageId],
		references: [messages.id]
	}),
	user: one(users, {
		fields: [messagesFiles.userId],
		references: [users.id]
	}),
}));

export const agentsToSessionsRelations = relations(agentsToSessions, ({one}) => ({
	agent: one(agents, {
		fields: [agentsToSessions.agentId],
		references: [agents.id]
	}),
	session: one(sessions, {
		fields: [agentsToSessions.sessionId],
		references: [sessions.id]
	}),
	user: one(users, {
		fields: [agentsToSessions.userId],
		references: [users.id]
	}),
}));

export const filesToSessionsRelations = relations(filesToSessions, ({one}) => ({
	file: one(files, {
		fields: [filesToSessions.fileId],
		references: [files.id]
	}),
	session: one(sessions, {
		fields: [filesToSessions.sessionId],
		references: [sessions.id]
	}),
	user: one(users, {
		fields: [filesToSessions.userId],
		references: [users.id]
	}),
}));

export const rbacRolePermissionsRelations = relations(rbacRolePermissions, ({one}) => ({
	rbacPermission: one(rbacPermissions, {
		fields: [rbacRolePermissions.permissionId],
		references: [rbacPermissions.id]
	}),
	rbacRole: one(rbacRoles, {
		fields: [rbacRolePermissions.roleId],
		references: [rbacRoles.id]
	}),
}));

export const rbacPermissionsRelations = relations(rbacPermissions, ({many}) => ({
	rbacRolePermissions: many(rbacRolePermissions),
}));

export const rbacRolesRelations = relations(rbacRoles, ({many}) => ({
	rbacRolePermissions: many(rbacRolePermissions),
	rbacUserRoles: many(rbacUserRoles),
}));

export const fileChunksRelations = relations(fileChunks, ({one}) => ({
	chunk: one(chunks, {
		fields: [fileChunks.chunkId],
		references: [chunks.id]
	}),
	file: one(files, {
		fields: [fileChunks.fileId],
		references: [files.id]
	}),
	user: one(users, {
		fields: [fileChunks.userId],
		references: [users.id]
	}),
}));

export const rbacUserRolesRelations = relations(rbacUserRoles, ({one}) => ({
	rbacRole: one(rbacRoles, {
		fields: [rbacUserRoles.roleId],
		references: [rbacRoles.id]
	}),
	user: one(users, {
		fields: [rbacUserRoles.userId],
		references: [users.id]
	}),
}));

export const knowledgeBaseFilesRelations = relations(knowledgeBaseFiles, ({one}) => ({
	file: one(files, {
		fields: [knowledgeBaseFiles.fileId],
		references: [files.id]
	}),
	knowledgeBase: one(knowledgeBases, {
		fields: [knowledgeBaseFiles.knowledgeBaseId],
		references: [knowledgeBases.id]
	}),
	user: one(users, {
		fields: [knowledgeBaseFiles.userId],
		references: [users.id]
	}),
}));

export const topicDocumentsRelations = relations(topicDocuments, ({one}) => ({
	document: one(documents, {
		fields: [topicDocuments.documentId],
		references: [documents.id]
	}),
	topic: one(topics, {
		fields: [topicDocuments.topicId],
		references: [topics.id]
	}),
	user: one(users, {
		fields: [topicDocuments.userId],
		references: [users.id]
	}),
}));

export const messageQueryChunksRelations = relations(messageQueryChunks, ({one}) => ({
	chunk: one(chunks, {
		fields: [messageQueryChunks.chunkId],
		references: [chunks.id]
	}),
	message: one(messages, {
		fields: [messageQueryChunks.id],
		references: [messages.id]
	}),
	messageQuery: one(messageQueries, {
		fields: [messageQueryChunks.queryId],
		references: [messageQueries.id]
	}),
	user: one(users, {
		fields: [messageQueryChunks.userId],
		references: [users.id]
	}),
}));

export const documentChunksRelations = relations(documentChunks, ({one}) => ({
	chunk: one(chunks, {
		fields: [documentChunks.chunkId],
		references: [chunks.id]
	}),
	document: one(documents, {
		fields: [documentChunks.documentId],
		references: [documents.id]
	}),
	user: one(users, {
		fields: [documentChunks.userId],
		references: [users.id]
	}),
}));

export const agentsFilesRelations = relations(agentsFiles, ({one}) => ({
	agent: one(agents, {
		fields: [agentsFiles.agentId],
		references: [agents.id]
	}),
	file: one(files, {
		fields: [agentsFiles.fileId],
		references: [files.id]
	}),
	user: one(users, {
		fields: [agentsFiles.userId],
		references: [users.id]
	}),
}));

export const agentsKnowledgeBasesRelations = relations(agentsKnowledgeBases, ({one}) => ({
	agent: one(agents, {
		fields: [agentsKnowledgeBases.agentId],
		references: [agents.id]
	}),
	knowledgeBase: one(knowledgeBases, {
		fields: [agentsKnowledgeBases.knowledgeBaseId],
		references: [knowledgeBases.id]
	}),
	user: one(users, {
		fields: [agentsKnowledgeBases.userId],
		references: [users.id]
	}),
}));

export const oidcConsentsRelations = relations(oidcConsents, ({one}) => ({
	oidcClient: one(oidcClients, {
		fields: [oidcConsents.clientId],
		references: [oidcClients.id]
	}),
	user: one(users, {
		fields: [oidcConsents.userId],
		references: [users.id]
	}),
}));

export const oidcClientsRelations = relations(oidcClients, ({many}) => ({
	oidcConsents: many(oidcConsents),
}));

export const userInstalledPluginsRelations = relations(userInstalledPlugins, ({one}) => ({
	user: one(users, {
		fields: [userInstalledPlugins.userId],
		references: [users.id]
	}),
}));

export const aiProvidersRelations = relations(aiProviders, ({one}) => ({
	user: one(users, {
		fields: [aiProviders.userId],
		references: [users.id]
	}),
}));

export const aiModelsRelations = relations(aiModels, ({one}) => ({
	user: one(users, {
		fields: [aiModels.userId],
		references: [users.id]
	}),
}));