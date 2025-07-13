import { pgTable, uniqueIndex, foreignKey, unique, text, varchar, jsonb, timestamp, uuid, integer, index, boolean, vector, primaryKey, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const agents = pgTable("agents", {
	id: text().primaryKey().notNull(),
	slug: varchar({ length: 100 }),
	title: text(),
	description: text(),
	tags: jsonb().default([]),
	avatar: text(),
	backgroundColor: text("background_color"),
	plugins: jsonb().default([]),
	clientId: text("client_id"),
	userId: text("user_id").notNull(),
	chatConfig: jsonb("chat_config"),
	fewShots: jsonb("few_shots"),
	model: text(),
	params: jsonb().default({}),
	provider: text(),
	systemRole: text("system_role"),
	tts: jsonb(),
	openingMessage: text("opening_message"),
	openingQuestions: text("opening_questions").array().default([""]),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "agents_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("agents_slug_unique").on(table.slug),
]);

export const asyncTasks = pgTable("async_tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: text(),
	status: text(),
	error: jsonb(),
	userId: text("user_id").notNull(),
	duration: integer(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "async_tasks_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const documents = pgTable("documents", {
	id: varchar({ length: 30 }).primaryKey().notNull(),
	title: text(),
	content: text(),
	fileType: varchar("file_type", { length: 255 }).notNull(),
	filename: text(),
	totalCharCount: integer("total_char_count").notNull(),
	totalLineCount: integer("total_line_count").notNull(),
	metadata: jsonb(),
	pages: jsonb(),
	sourceType: text("source_type").notNull(),
	source: text().notNull(),
	fileId: text("file_id"),
	userId: text("user_id").notNull(),
	clientId: text("client_id"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("documents_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index("documents_file_id_idx").using("btree", table.fileId.asc().nullsLast().op("text_ops")),
	index("documents_file_type_idx").using("btree", table.fileType.asc().nullsLast().op("text_ops")),
	index("documents_source_idx").using("btree", table.source.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "documents_file_id_files_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "documents_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const files = pgTable("files", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	fileType: varchar("file_type", { length: 255 }).notNull(),
	fileHash: varchar("file_hash", { length: 64 }),
	name: text().notNull(),
	size: integer().notNull(),
	url: text().notNull(),
	clientId: text("client_id"),
	metadata: jsonb(),
	chunkTaskId: uuid("chunk_task_id"),
	embeddingTaskId: uuid("embedding_task_id"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("file_hash_idx").using("btree", table.fileHash.asc().nullsLast().op("text_ops")),
	uniqueIndex("files_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.chunkTaskId],
			foreignColumns: [asyncTasks.id],
			name: "files_chunk_task_id_async_tasks_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.embeddingTaskId],
			foreignColumns: [asyncTasks.id],
			name: "files_embedding_task_id_async_tasks_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.fileHash],
			foreignColumns: [globalFiles.hashId],
			name: "files_file_hash_global_files_hash_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "files_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const messagePlugins = pgTable("message_plugins", {
	id: text().primaryKey().notNull(),
	toolCallId: text("tool_call_id"),
	type: text().default('default'),
	apiName: text("api_name"),
	arguments: text(),
	identifier: text(),
	state: jsonb(),
	error: jsonb(),
	clientId: text("client_id"),
	userId: text("user_id").notNull(),
}, (table) => [
	uniqueIndex("message_plugins_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.id],
			foreignColumns: [messages.id],
			name: "message_plugins_id_messages_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "message_plugins_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const knowledgeBases = pgTable("knowledge_bases", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	avatar: text(),
	type: text(),
	userId: text("user_id").notNull(),
	clientId: text("client_id"),
	isPublic: boolean("is_public").default(false),
	settings: jsonb(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("knowledge_bases_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "knowledge_bases_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const messageTts = pgTable("message_tts", {
	id: text().primaryKey().notNull(),
	contentMd5: text("content_md5"),
	fileId: text("file_id"),
	voice: text(),
	clientId: text("client_id"),
	userId: text("user_id").notNull(),
}, (table) => [
	uniqueIndex("message_tts_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "message_tts_file_id_files_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.id],
			foreignColumns: [messages.id],
			name: "message_tts_id_messages_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "message_tts_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const messageQueries = pgTable("message_queries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	messageId: text("message_id").notNull(),
	rewriteQuery: text("rewrite_query"),
	userQuery: text("user_query"),
	clientId: text("client_id"),
	userId: text("user_id").notNull(),
	embeddingsId: uuid("embeddings_id"),
}, (table) => [
	uniqueIndex("message_queries_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.embeddingsId],
			foreignColumns: [embeddings.id],
			name: "message_queries_embeddings_id_embeddings_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "message_queries_message_id_messages_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "message_queries_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const messageTranslates = pgTable("message_translates", {
	id: text().primaryKey().notNull(),
	content: text(),
	from: text(),
	to: text(),
	clientId: text("client_id"),
	userId: text("user_id").notNull(),
}, (table) => [
	uniqueIndex("message_translates_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.id],
			foreignColumns: [messages.id],
			name: "message_translates_id_messages_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "message_translates_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const oidcAccessTokens = pgTable("oidc_access_tokens", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	data: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true, mode: 'string' }),
	userId: text("user_id").notNull(),
	clientId: varchar("client_id", { length: 255 }).notNull(),
	grantId: varchar("grant_id", { length: 255 }),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "oidc_access_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const oidcAuthorizationCodes = pgTable("oidc_authorization_codes", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	data: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true, mode: 'string' }),
	userId: text("user_id").notNull(),
	clientId: varchar("client_id", { length: 255 }).notNull(),
	grantId: varchar("grant_id", { length: 255 }),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "oidc_authorization_codes_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const oidcClients = pgTable("oidc_clients", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	clientSecret: varchar("client_secret", { length: 255 }),
	redirectUris: text("redirect_uris").array().notNull(),
	grants: text().array().notNull(),
	responseTypes: text("response_types").array().notNull(),
	scopes: text().array().notNull(),
	tokenEndpointAuthMethod: varchar("token_endpoint_auth_method", { length: 20 }),
	applicationType: varchar("application_type", { length: 20 }),
	clientUri: text("client_uri"),
	logoUri: text("logo_uri"),
	policyUri: text("policy_uri"),
	tosUri: text("tos_uri"),
	isFirstParty: boolean("is_first_party").default(false),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
	id: text().primaryKey().notNull(),
	role: text().notNull(),
	content: text(),
	reasoning: jsonb(),
	search: jsonb(),
	metadata: jsonb(),
	model: text(),
	provider: text(),
	favorite: boolean().default(false),
	error: jsonb(),
	tools: jsonb(),
	traceId: text("trace_id"),
	observationId: text("observation_id"),
	clientId: text("client_id"),
	userId: text("user_id").notNull(),
	sessionId: text("session_id"),
	topicId: text("topic_id"),
	threadId: text("thread_id"),
	parentId: text("parent_id"),
	quotaId: text("quota_id"),
	agentId: text("agent_id"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("message_client_id_user_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index("messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("messages_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("text_ops")),
	index("messages_quota_id_idx").using("btree", table.quotaId.asc().nullsLast().op("text_ops")),
	index("messages_topic_id_idx").using("btree", table.topicId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "messages_agent_id_agents_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "messages_parent_id_messages_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.quotaId],
			foreignColumns: [table.id],
			name: "messages_quota_id_messages_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "messages_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.threadId],
			foreignColumns: [threads.id],
			name: "messages_thread_id_threads_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [topics.id],
			name: "messages_topic_id_topics_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "messages_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const oidcRefreshTokens = pgTable("oidc_refresh_tokens", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	data: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true, mode: 'string' }),
	userId: text("user_id").notNull(),
	clientId: varchar("client_id", { length: 255 }).notNull(),
	grantId: varchar("grant_id", { length: 255 }),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "oidc_refresh_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const oidcInteractions = pgTable("oidc_interactions", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	data: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const oidcSessions = pgTable("oidc_sessions", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	data: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	userId: text("user_id").notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "oidc_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const teamActivityLog = pgTable("team_activity_log", {
	id: text().primaryKey().notNull(),
	teamId: text("team_id").notNull(),
	userId: text("user_id").notNull(),
	action: text().notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_activity_log_team_id_teams_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "team_activity_log_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const organizations = pgTable("organizations", {
	id: text().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	logo: text(),
	website: text(),
	settings: jsonb(),
	billingEmail: text("billing_email"),
	subscriptionTier: text("subscription_tier").default('free'),
	isActive: boolean("is_active").default(true),
	ownerId: text("owner_id").notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clerkOrgId: text("clerk_org_id"),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "organizations_owner_id_users_id_fk"
		}).onDelete("restrict"),
	unique("organizations_slug_unique").on(table.slug),
]);

export const oidcDeviceCodes = pgTable("oidc_device_codes", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	data: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true, mode: 'string' }),
	userId: text("user_id"),
	clientId: varchar("client_id", { length: 255 }).notNull(),
	grantId: varchar("grant_id", { length: 255 }),
	userCode: varchar("user_code", { length: 255 }),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "oidc_device_codes_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const oidcGrants = pgTable("oidc_grants", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	data: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true, mode: 'string' }),
	userId: text("user_id").notNull(),
	clientId: varchar("client_id", { length: 255 }).notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "oidc_grants_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const teamMembers = pgTable("team_members", {
	id: text().primaryKey().notNull(),
	teamId: text("team_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('member').notNull(),
	permissions: jsonb(),
	isActive: boolean("is_active").default(true),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_members_team_id_teams_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "team_members_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const teamMessages = pgTable("team_messages", {
	id: text().primaryKey().notNull(),
	channelId: text("channel_id").notNull(),
	senderId: text("sender_id").notNull(),
	content: text().notNull(),
	type: text().default('text'),
	metadata: jsonb(),
	isEdited: boolean("is_edited").default(false),
	isDeleted: boolean("is_deleted").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [teamChannels.id],
			name: "team_messages_channel_id_team_channels_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "team_messages_sender_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const teamInvitations = pgTable("team_invitations", {
	id: text().primaryKey().notNull(),
	teamId: text("team_id").notNull(),
	invitedBy: text("invited_by").notNull(),
	email: text().notNull(),
	role: text().default('member').notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: text().default('pending').notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clerkInvitationId: text("clerk_invitation_id"),
}, (table) => [
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "team_invitations_invited_by_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_invitations_team_id_teams_id_fk"
		}).onDelete("cascade"),
	unique("team_invitations_token_unique").on(table.token),
]);

export const teamChannels = pgTable("team_channels", {
	id: text().primaryKey().notNull(),
	teamId: text("team_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	type: text().default('general').notNull(),
	isPrivate: boolean("is_private").default(false),
	isArchived: boolean("is_archived").default(false),
	settings: jsonb(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_channels_team_id_teams_id_fk"
		}).onDelete("cascade"),
]);

export const teams = pgTable("teams", {
	id: text().primaryKey().notNull(),
	organizationId: text("organization_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	icon: text(),
	settings: jsonb(),
	isActive: boolean("is_active").default(true),
	isArchived: boolean("is_archived").default(false),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "teams_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const chunks = pgTable("chunks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	text: text(),
	abstract: text(),
	metadata: jsonb(),
	index: integer(),
	type: varchar(),
	clientId: text("client_id"),
	userId: text("user_id"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("chunks_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chunks_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const ragEvalDatasets = pgTable("rag_eval_datasets", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "rag_eval_datasets_id_seq", startWith: 30000, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	description: text(),
	name: text().notNull(),
	knowledgeBaseId: text("knowledge_base_id"),
	userId: text("user_id"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.knowledgeBaseId],
			foreignColumns: [knowledgeBases.id],
			name: "rag_eval_datasets_knowledge_base_id_knowledge_bases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "rag_eval_datasets_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const ragEvalEvaluations = pgTable("rag_eval_evaluations", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "rag_eval_evaluations_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	description: text(),
	evalRecordsUrl: text("eval_records_url"),
	status: text(),
	error: jsonb(),
	datasetId: integer("dataset_id").notNull(),
	knowledgeBaseId: text("knowledge_base_id"),
	languageModel: text("language_model"),
	embeddingModel: text("embedding_model"),
	userId: text("user_id"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.datasetId],
			foreignColumns: [ragEvalDatasets.id],
			name: "rag_eval_evaluations_dataset_id_rag_eval_datasets_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.knowledgeBaseId],
			foreignColumns: [knowledgeBases.id],
			name: "rag_eval_evaluations_knowledge_base_id_knowledge_bases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "rag_eval_evaluations_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const ragEvalEvaluationRecords = pgTable("rag_eval_evaluation_records", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "rag_eval_evaluation_records_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	question: text().notNull(),
	answer: text(),
	context: text().array(),
	ideal: text(),
	status: text(),
	error: jsonb(),
	languageModel: text("language_model"),
	embeddingModel: text("embedding_model"),
	questionEmbeddingId: uuid("question_embedding_id"),
	duration: integer(),
	datasetRecordId: integer("dataset_record_id").notNull(),
	evaluationId: integer("evaluation_id").notNull(),
	userId: text("user_id"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "rag_eval_evaluation_records_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const embeddings = pgTable("embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chunkId: uuid("chunk_id"),
	embeddings: vector({ dimensions: 1024 }),
	model: text(),
	clientId: text("client_id"),
	userId: text("user_id"),
}, (table) => [
	uniqueIndex("embeddings_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.chunkId],
			foreignColumns: [chunks.id],
			name: "embeddings_chunk_id_chunks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "embeddings_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("embeddings_chunk_id_unique").on(table.chunkId),
]);

export const unstructuredChunks = pgTable("unstructured_chunks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	text: text(),
	metadata: jsonb(),
	index: integer(),
	type: varchar(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	parentId: varchar("parent_id"),
	compositeId: uuid("composite_id"),
	clientId: text("client_id"),
	userId: text("user_id"),
	fileId: varchar("file_id"),
}, (table) => [
	uniqueIndex("unstructured_chunks_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.compositeId],
			foreignColumns: [chunks.id],
			name: "unstructured_chunks_composite_id_chunks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "unstructured_chunks_file_id_files_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "unstructured_chunks_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const rbacPermissions = pgTable("rbac_permissions", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "rbac_permissions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("rbac_permissions_code_unique").on(table.code),
]);

export const sessionGroups = pgTable("session_groups", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	sort: integer(),
	userId: text("user_id").notNull(),
	clientId: text("client_id"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("session_groups_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "session_groups_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const threads = pgTable("threads", {
	id: text().primaryKey().notNull(),
	title: text(),
	type: text().notNull(),
	status: text().default('active'),
	topicId: text("topic_id").notNull(),
	sourceMessageId: text("source_message_id").notNull(),
	parentThreadId: text("parent_thread_id"),
	clientId: text("client_id"),
	userId: text("user_id").notNull(),
	lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("threads_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parentThreadId],
			foreignColumns: [table.id],
			name: "threads_parent_thread_id_threads_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [topics.id],
			name: "threads_topic_id_topics_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "threads_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const rbacRoles = pgTable("rbac_roles", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "rbac_roles_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	displayName: text("display_name").notNull(),
	description: text(),
	isSystem: boolean("is_system").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("rbac_roles_name_unique").on(table.name),
]);

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	slug: varchar({ length: 100 }).notNull(),
	title: text(),
	description: text(),
	avatar: text(),
	backgroundColor: text("background_color"),
	type: text().default('agent'),
	userId: text("user_id").notNull(),
	groupId: text("group_id"),
	clientId: text("client_id"),
	pinned: boolean().default(false),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("sessions_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	uniqueIndex("slug_user_id_unique").using("btree", table.slug.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [sessionGroups.id],
			name: "sessions_group_id_session_groups_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const teamMessageReactions = pgTable("team_message_reactions", {
	id: text().primaryKey().notNull(),
	messageId: text("message_id").notNull(),
	userId: text("user_id").notNull(),
	reaction: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [teamMessages.id],
			name: "team_message_reactions_message_id_team_messages_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "team_message_reactions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const ragEvalDatasetRecords = pgTable("rag_eval_dataset_records", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "rag_eval_dataset_records_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	datasetId: integer("dataset_id").notNull(),
	ideal: text(),
	question: text(),
	referenceFiles: text("reference_files").array(),
	metadata: jsonb(),
	userId: text("user_id"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.datasetId],
			foreignColumns: [ragEvalDatasets.id],
			name: "rag_eval_dataset_records_dataset_id_rag_eval_datasets_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "rag_eval_dataset_records_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	username: text(),
	email: text(),
	avatar: text(),
	phone: text(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	fullName: text("full_name"),
	isOnboarded: boolean("is_onboarded").default(false),
	clerkCreatedAt: timestamp("clerk_created_at", { withTimezone: true, mode: 'string' }),
	emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true, mode: 'string' }),
	preference: jsonb(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const globalFiles = pgTable("global_files", {
	hashId: varchar("hash_id", { length: 64 }).primaryKey().notNull(),
	fileType: varchar("file_type", { length: 255 }).notNull(),
	size: integer().notNull(),
	url: text().notNull(),
	metadata: jsonb(),
	creator: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.creator],
			foreignColumns: [users.id],
			name: "global_files_creator_users_id_fk"
		}).onDelete("set null"),
]);

export const topics = pgTable("topics", {
	id: text().primaryKey().notNull(),
	title: text(),
	favorite: boolean().default(false),
	sessionId: text("session_id"),
	userId: text("user_id").notNull(),
	clientId: text("client_id"),
	historySummary: text("history_summary"),
	metadata: jsonb(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("topics_client_id_user_id_unique").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "topics_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "topics_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const organizationMembers = pgTable("organization_members", {
	id: text().primaryKey().notNull(),
	organizationId: text("organization_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('member').notNull(),
	permissions: jsonb(),
	isActive: boolean("is_active").default(true),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_members_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "organization_members_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userSettings = pgTable("user_settings", {
	id: text().primaryKey().notNull(),
	tts: jsonb(),
	hotkey: jsonb(),
	keyVaults: text("key_vaults"),
	general: jsonb(),
	languageModel: jsonb("language_model"),
	systemAgent: jsonb("system_agent"),
	defaultAgent: jsonb("default_agent"),
	tool: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "user_settings_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const messageChunks = pgTable("message_chunks", {
	messageId: text("message_id").notNull(),
	chunkId: uuid("chunk_id").notNull(),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chunkId],
			foreignColumns: [chunks.id],
			name: "message_chunks_chunk_id_chunks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "message_chunks_message_id_messages_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "message_chunks_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.messageId, table.chunkId], name: "message_chunks_chunk_id_message_id_pk"}),
]);

export const messagesFiles = pgTable("messages_files", {
	fileId: text("file_id").notNull(),
	messageId: text("message_id").notNull(),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "messages_files_file_id_files_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "messages_files_message_id_messages_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "messages_files_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.fileId, table.messageId], name: "messages_files_file_id_message_id_pk"}),
]);

export const agentsToSessions = pgTable("agents_to_sessions", {
	agentId: text("agent_id").notNull(),
	sessionId: text("session_id").notNull(),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agents_to_sessions_agent_id_agents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "agents_to_sessions_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "agents_to_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.agentId, table.sessionId], name: "agents_to_sessions_agent_id_session_id_pk"}),
]);

export const filesToSessions = pgTable("files_to_sessions", {
	fileId: text("file_id").notNull(),
	sessionId: text("session_id").notNull(),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "files_to_sessions_file_id_files_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "files_to_sessions_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "files_to_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.fileId, table.sessionId], name: "files_to_sessions_file_id_session_id_pk"}),
]);

export const rbacRolePermissions = pgTable("rbac_role_permissions", {
	roleId: integer("role_id").notNull(),
	permissionId: integer("permission_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("rbac_role_permissions_permission_id_idx").using("btree", table.permissionId.asc().nullsLast().op("int4_ops")),
	index("rbac_role_permissions_role_id_idx").using("btree", table.roleId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [rbacPermissions.id],
			name: "rbac_role_permissions_permission_id_rbac_permissions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rbacRoles.id],
			name: "rbac_role_permissions_role_id_rbac_roles_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.roleId, table.permissionId], name: "rbac_role_permissions_role_id_permission_id_pk"}),
]);

export const fileChunks = pgTable("file_chunks", {
	fileId: varchar("file_id").notNull(),
	chunkId: uuid("chunk_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chunkId],
			foreignColumns: [chunks.id],
			name: "file_chunks_chunk_id_chunks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "file_chunks_file_id_files_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "file_chunks_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.fileId, table.chunkId], name: "file_chunks_file_id_chunk_id_pk"}),
]);

export const rbacUserRoles = pgTable("rbac_user_roles", {
	userId: text("user_id").notNull(),
	roleId: integer("role_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("rbac_user_roles_role_id_idx").using("btree", table.roleId.asc().nullsLast().op("int4_ops")),
	index("rbac_user_roles_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rbacRoles.id],
			name: "rbac_user_roles_role_id_rbac_roles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "rbac_user_roles_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.roleId], name: "rbac_user_roles_user_id_role_id_pk"}),
]);

export const knowledgeBaseFiles = pgTable("knowledge_base_files", {
	knowledgeBaseId: text("knowledge_base_id").notNull(),
	fileId: text("file_id").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "knowledge_base_files_file_id_files_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.knowledgeBaseId],
			foreignColumns: [knowledgeBases.id],
			name: "knowledge_base_files_knowledge_base_id_knowledge_bases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "knowledge_base_files_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.knowledgeBaseId, table.fileId], name: "knowledge_base_files_knowledge_base_id_file_id_pk"}),
]);

export const topicDocuments = pgTable("topic_documents", {
	documentId: text("document_id").notNull(),
	topicId: text("topic_id").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "topic_documents_document_id_documents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [topics.id],
			name: "topic_documents_topic_id_topics_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "topic_documents_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.documentId, table.topicId], name: "topic_documents_document_id_topic_id_pk"}),
]);

export const messageQueryChunks = pgTable("message_query_chunks", {
	id: text().notNull(),
	queryId: uuid("query_id").notNull(),
	chunkId: uuid("chunk_id").notNull(),
	similarity: numeric({ precision: 6, scale:  5 }),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chunkId],
			foreignColumns: [chunks.id],
			name: "message_query_chunks_chunk_id_chunks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.id],
			foreignColumns: [messages.id],
			name: "message_query_chunks_id_messages_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.queryId],
			foreignColumns: [messageQueries.id],
			name: "message_query_chunks_query_id_message_queries_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "message_query_chunks_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.id, table.queryId, table.chunkId], name: "message_query_chunks_chunk_id_id_query_id_pk"}),
]);

export const documentChunks = pgTable("document_chunks", {
	documentId: varchar("document_id", { length: 30 }).notNull(),
	chunkId: uuid("chunk_id").notNull(),
	pageIndex: integer("page_index"),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chunkId],
			foreignColumns: [chunks.id],
			name: "document_chunks_chunk_id_chunks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "document_chunks_document_id_documents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "document_chunks_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.documentId, table.chunkId], name: "document_chunks_document_id_chunk_id_pk"}),
]);

export const agentsFiles = pgTable("agents_files", {
	fileId: text("file_id").notNull(),
	agentId: text("agent_id").notNull(),
	enabled: boolean().default(true),
	userId: text("user_id").notNull(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agents_files_agent_id_agents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "agents_files_file_id_files_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "agents_files_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.fileId, table.agentId, table.userId], name: "agents_files_file_id_agent_id_user_id_pk"}),
]);

export const agentsKnowledgeBases = pgTable("agents_knowledge_bases", {
	agentId: text("agent_id").notNull(),
	knowledgeBaseId: text("knowledge_base_id").notNull(),
	userId: text("user_id").notNull(),
	enabled: boolean().default(true),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agents_knowledge_bases_agent_id_agents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.knowledgeBaseId],
			foreignColumns: [knowledgeBases.id],
			name: "agents_knowledge_bases_knowledge_base_id_knowledge_bases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "agents_knowledge_bases_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.agentId, table.knowledgeBaseId], name: "agents_knowledge_bases_agent_id_knowledge_base_id_pk"}),
]);

export const oidcConsents = pgTable("oidc_consents", {
	userId: text("user_id").notNull(),
	clientId: varchar("client_id", { length: 255 }).notNull(),
	scopes: text().array().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [oidcClients.id],
			name: "oidc_consents_client_id_oidc_clients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "oidc_consents_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.clientId], name: "oidc_consents_user_id_client_id_pk"}),
]);

export const userInstalledPlugins = pgTable("user_installed_plugins", {
	userId: text("user_id").notNull(),
	identifier: text().notNull(),
	type: text().notNull(),
	manifest: jsonb(),
	settings: jsonb(),
	customParams: jsonb("custom_params"),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_installed_plugins_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.identifier], name: "user_installed_plugins_user_id_identifier_pk"}),
]);

export const aiProviders = pgTable("ai_providers", {
	id: varchar({ length: 64 }).notNull(),
	name: text(),
	userId: text("user_id").notNull(),
	sort: integer(),
	enabled: boolean(),
	fetchOnClient: boolean("fetch_on_client"),
	checkModel: text("check_model"),
	logo: text(),
	description: text(),
	keyVaults: text("key_vaults"),
	source: varchar({ length: 20 }),
	settings: jsonb(),
	config: jsonb(),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_providers_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.id, table.userId], name: "ai_providers_id_user_id_pk"}),
]);

export const aiModels = pgTable("ai_models", {
	id: varchar({ length: 150 }).notNull(),
	displayName: varchar("display_name", { length: 200 }),
	description: text(),
	organization: varchar({ length: 100 }),
	enabled: boolean(),
	providerId: varchar("provider_id", { length: 64 }).notNull(),
	type: varchar({ length: 20 }).default('chat').notNull(),
	sort: integer(),
	userId: text("user_id").notNull(),
	pricing: jsonb(),
	parameters: jsonb().default({}),
	config: jsonb(),
	abilities: jsonb().default({}),
	contextWindowTokens: integer("context_window_tokens"),
	source: varchar({ length: 20 }),
	releasedAt: varchar("released_at", { length: 10 }),
	accessedAt: timestamp("accessed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_models_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.id, table.providerId, table.userId], name: "ai_models_id_provider_id_user_id_pk"}),
]);
