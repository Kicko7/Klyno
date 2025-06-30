import type {
  ApiResponse,
  CreateOperation,
  KlynoUserProfile,
  PromptTemplate,
  RealtimeEvent,
  Team,
  TeamConversation,
  TeamInvitation,
  TeamMember,
  TeamRole,
  UpdateOperation,
  UsageTracking,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from '@/types/klyno';

// Define TeamMessage type locally since it's not exported from the main types
interface TeamMessage {
  conversationId: string;
  createdAt: Date;
  messageId: string;
  metadata: Record<string, unknown>;
  updatedAt: Date;
  userId: string;
}

// Service interface definitions
export interface IKlynoUserService {
  getTeamUsage(teamId: string): Promise<ApiResponse<UsageTracking[]>>;
  // User profile operations
  getUserProfile(userId: string): Promise<ApiResponse<KlynoUserProfile>>;
  getUserUsage(userId: string): Promise<ApiResponse<UsageTracking[]>>;

  syncUserWithClerk(clerkUser: Record<string, unknown>): Promise<ApiResponse<KlynoUserProfile>>;
  // Usage tracking
  trackUsage(usageData: CreateOperation<UsageTracking>): Promise<ApiResponse<UsageTracking>>;
  updateUserProfile(
    userId: string,
    data: UpdateOperation<KlynoUserProfile>,
  ): Promise<ApiResponse<KlynoUserProfile>>;
}

export interface IKlynoTeamService {
  acceptTeamInvitation(invitationId: string, userId: string): Promise<ApiResponse<TeamMember>>;
  // Team member operations
  addTeamMember(data: CreateOperation<TeamMember>): Promise<ApiResponse<TeamMember>>;
  // Team operations
  createTeam(data: CreateOperation<Team>): Promise<ApiResponse<Team>>;
  // Team invitations
  createTeamInvitation(data: CreateOperation<TeamInvitation>): Promise<ApiResponse<TeamInvitation>>;

  declineTeamInvitation(invitationId: string): Promise<ApiResponse<void>>;
  deleteTeam(teamId: string): Promise<ApiResponse<void>>;
  getTeam(teamId: string): Promise<ApiResponse<Team>>;
  getTeamInvitations(teamId: string): Promise<ApiResponse<TeamInvitation[]>>;

  getTeamMembers(teamId: string): Promise<ApiResponse<TeamMember[]>>;
  removeTeamMember(teamId: string, userId: string): Promise<ApiResponse<void>>;
  subscribeToTeamMembers(
    teamId: string,
    callback: (event: RealtimeEvent<TeamMember>) => void,
  ): () => void;
  // Real-time subscriptions
  subscribeToTeamUpdates(
    teamId: string,
    callback: (event: RealtimeEvent<Team>) => void,
  ): () => void;

  updateTeam(teamId: string, data: UpdateOperation<Team>): Promise<ApiResponse<Team>>;
  updateTeamMember(
    teamId: string,
    userId: string,
    data: UpdateOperation<TeamMember>,
  ): Promise<ApiResponse<TeamMember>>;
}

export interface IKlynoWorkspaceService {
  acceptWorkspaceInvitation(
    invitationId: string,
    userId: string,
  ): Promise<ApiResponse<WorkspaceMember>>;
  // Workspace member operations
  addWorkspaceMember(data: CreateOperation<WorkspaceMember>): Promise<ApiResponse<WorkspaceMember>>;
  // Workspace operations
  createWorkspace(data: CreateOperation<Workspace>): Promise<ApiResponse<Workspace>>;
  // Workspace invitations
  createWorkspaceInvitation(
    data: CreateOperation<WorkspaceInvitation>,
  ): Promise<ApiResponse<WorkspaceInvitation>>;
  declineWorkspaceInvitation(invitationId: string): Promise<ApiResponse<void>>;

  deleteWorkspace(workspaceId: string): Promise<ApiResponse<void>>;
  getTeamWorkspaces(teamId: string): Promise<ApiResponse<Workspace[]>>;
  getWorkspace(workspaceId: string): Promise<ApiResponse<Workspace>>;
  getWorkspaceInvitations(workspaceId: string): Promise<ApiResponse<WorkspaceInvitation[]>>;

  getWorkspaceMembers(workspaceId: string): Promise<ApiResponse<WorkspaceMember[]>>;
  removeWorkspaceMember(workspaceId: string, userId: string): Promise<ApiResponse<void>>;
  subscribeToWorkspaceMembers(
    workspaceId: string,
    callback: (event: RealtimeEvent<WorkspaceMember>) => void,
  ): () => void;
  // Real-time subscriptions
  subscribeToWorkspaceUpdates(
    workspaceId: string,
    callback: (event: RealtimeEvent<Workspace>) => void,
  ): () => void;

  updateWorkspace(
    workspaceId: string,
    data: UpdateOperation<Workspace>,
  ): Promise<ApiResponse<Workspace>>;
  updateWorkspaceMember(
    workspaceId: string,
    userId: string,
    data: UpdateOperation<WorkspaceMember>,
  ): Promise<ApiResponse<WorkspaceMember>>;
}

export interface IKlynoConversationService {
  // Team conversation operations
  createTeamConversation(
    data: CreateOperation<TeamConversation>,
  ): Promise<ApiResponse<TeamConversation>>;
  // Team message operations
  createTeamMessage(data: CreateOperation<TeamMessage>): Promise<ApiResponse<TeamMessage>>;
  deleteTeamConversation(conversationId: string): Promise<ApiResponse<void>>;
  deleteTeamMessage(messageId: string): Promise<ApiResponse<void>>;
  getConversationMessages(conversationId: string): Promise<ApiResponse<TeamMessage[]>>;

  getTeamConversation(conversationId: string): Promise<ApiResponse<TeamConversation>>;
  getTeamMessage(messageId: string): Promise<ApiResponse<TeamMessage>>;
  getWorkspaceConversations(workspaceId: string): Promise<ApiResponse<TeamConversation[]>>;
  subscribeToConversationMessages(
    conversationId: string,
    callback: (event: RealtimeEvent<TeamMessage>) => void,
  ): () => void;
  // Real-time subscriptions
  subscribeToTeamMessages(
    teamId: string,
    callback: (event: RealtimeEvent<TeamMessage>) => void,
  ): () => void;

  updateTeamConversation(
    conversationId: string,
    data: UpdateOperation<TeamConversation>,
  ): Promise<ApiResponse<TeamConversation>>;
  updateTeamMessage(
    messageId: string,
    data: UpdateOperation<TeamMessage>,
  ): Promise<ApiResponse<TeamMessage>>;
}

export interface IKlynoPromptTemplateService {
  // Prompt template operations
  createPromptTemplate(data: CreateOperation<PromptTemplate>): Promise<ApiResponse<PromptTemplate>>;
  deletePromptTemplate(templateId: string): Promise<ApiResponse<void>>;
  getPromptTemplate(templateId: string): Promise<ApiResponse<PromptTemplate>>;
  getPublicTemplates(): Promise<ApiResponse<PromptTemplate[]>>;

  getTeamTemplates(teamId: string): Promise<ApiResponse<PromptTemplate[]>>;
  // Template queries
  getUserTemplates(userId: string): Promise<ApiResponse<PromptTemplate[]>>;
  // Template rendering
  renderTemplate(
    templateId: string,
    variables: Record<string, unknown>,
  ): Promise<ApiResponse<string>>;

  updatePromptTemplate(
    templateId: string,
    data: UpdateOperation<PromptTemplate>,
  ): Promise<ApiResponse<PromptTemplate>>;
}

// Service factory interface
export interface IKlynoServiceFactory {
  conversations: IKlynoConversationService;
  promptTemplates: IKlynoPromptTemplateService;
  teams: IKlynoTeamService;
  users: IKlynoUserService;
  workspaces: IKlynoWorkspaceService;
}

// Error types for services
export interface ServiceError {
  code: string;
  details?: unknown;
  message: string;
  timestamp: Date;
}

// Query options for pagination and filtering
export interface QueryOptions {
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  orderBy?: {
    direction: 'asc' | 'desc';
    field: string;
  };
}

// Real-time subscription options
export interface SubscriptionOptions {
  event?: 'insert' | 'update' | 'delete' | '*';
  filter?: string;
}

// Service configuration
export interface KlynoServiceConfig {
  debugMode: boolean;
  realtimeEnabled: boolean;
  supabaseKey: string;
  supabaseUrl: string;
}

// Utility types for service responses
export type ServiceResult<T> = Promise<ApiResponse<T>>;
export type ServiceListResult<T> = Promise<ApiResponse<T[]>>;
export type ServiceVoidResult = Promise<ApiResponse<void>>;

// Type guards for runtime type checking
export const isTeamRole = (role: string): role is TeamRole => {
  return ['owner', 'admin', 'member'].includes(role);
};

export const isWorkspaceRole = (role: string): role is WorkspaceRole => {
  return ['owner', 'admin', 'member', 'viewer'].includes(role);
};

export const isSubscriptionTier = (tier: string): tier is KlynoUserProfile['subscriptionTier'] => {
  return ['starter', 'pro', 'ultimate'].includes(tier);
};

export const isSubscriptionStatus = (
  status: string,
): status is KlynoUserProfile['subscriptionStatus'] => {
  return ['active', 'canceled', 'past_due'].includes(status);
};
