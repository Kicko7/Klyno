// Klyno-specific type definitions for enhanced type safety

// User-related types
export interface KlynoUserProfile {
  clerkId: string;
  settings: Record<string, unknown>;
  stripeCustomerId?: string;
  subscriptionStatus: 'active' | 'canceled' | 'past_due';
  subscriptionTier: 'starter' | 'pro' | 'ultimate';
  usageCurrent: number;
  usageQuota: number;
  userId: string;
}

// Team-related types
export interface Team {
  avatar?: string;
  createdAt: Date;
  description?: string;
  id: string;
  name: string;
  settings: Record<string, unknown>;
  updatedAt: Date;
}

export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamMember {
  createdAt: Date;
  role: TeamRole;
  settings: Record<string, unknown>;
  teamId: string;
  updatedAt: Date;
  userId: string;
}

// Workspace-related types
export interface Workspace {
  avatar?: string;
  createdAt: Date;
  description?: string;
  id: string;
  name: string;
  settings: Record<string, unknown>;
  teamId: string;
  updatedAt: Date;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspaceMember {
  createdAt: Date;
  role: WorkspaceRole;
  settings: Record<string, unknown>;
  updatedAt: Date;
  userId: string;
  workspaceId: string;
}

// Conversation and Message types
export interface TeamConversation {
  conversationId: string;
  createdAt: Date;
  settings: Record<string, unknown>;
  teamId: string;
  updatedAt: Date;
  workspaceId?: string;
}

export interface TeamMessage {
  conversationId: string;
  createdAt: Date;
  messageId: string;
  metadata: Record<string, unknown>;
  updatedAt: Date;
  userId: string;
}

// Usage tracking types
export interface UsageTracking {
  cost?: number;
  createdAt: Date;
  id: string;
  metadata: Record<string, unknown>;
  model: string;
  provider: string;
  // in cents
  requestType: 'chat' | 'completion' | 'embedding' | 'image' | 'audio';
  teamId?: string;
  tokensUsed: number;
  updatedAt: Date;
  userId: string;
}

// Prompt template types
export interface PromptTemplate {
  content: string;
  createdAt: Date;
  description?: string;
  id: string;
  isPublic: boolean;
  name: string;
  settings: Record<string, unknown>;
  teamId?: string;
  updatedAt: Date;
  userId?: string;
  variables: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code?: string;
    details?: unknown;
    message: string;
  };
  success: boolean;
}

// Real-time event types
export interface RealtimeEvent<T = unknown> {
  oldRecord?: T;
  record: T;
  table: string;
  type: 'insert' | 'update' | 'delete';
}

// Team invitation types
export interface TeamInvitation {
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  invitedBy: string;
  role: TeamRole;
  status: 'pending' | 'accepted' | 'expired';
  teamId: string;
  updatedAt: Date;
}

// Workspace invitation types
export interface WorkspaceInvitation {
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  invitedBy: string;
  role: WorkspaceRole;
  status: 'pending' | 'accepted' | 'expired';
  updatedAt: Date;
  workspaceId: string;
}

// Settings types
export interface UserSettings {
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    teamUpdates: boolean;
  };
  privacy: {
    activityVisibility: 'public' | 'private' | 'team';
    profileVisibility: 'public' | 'private' | 'team';
  };
  theme: 'light' | 'dark' | 'system';
}

export interface TeamSettings {
  avatar?: string;
  billing: {
    billingCycle: 'monthly' | 'yearly';
    plan: 'starter' | 'pro' | 'ultimate';
  };
  description?: string;
  name: string;
  permissions: {
    allowApiKeySharing: boolean;
    allowMemberInvites: boolean;
    allowWorkspaceCreation: boolean;
  };
}

export interface WorkspaceSettings {
  avatar?: string;
  description?: string;
  features: {
    enableAnalytics: boolean;
    enableRealTimeCollaboration: boolean;
    enableVersionControl: boolean;
  };
  name: string;
  permissions: {
    allowConversationCreation: boolean;
    allowFileUploads: boolean;
    allowMemberInvites: boolean;
  };
}

// Error types
export interface KlynoError {
  code: string;
  details?: unknown;
  message: string;
  teamId?: string;
  timestamp: Date;
  userId?: string;
  workspaceId?: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type WithoutTimestamps<T> = Omit<T, 'createdAt' | 'updatedAt'>;

// Database operation types
export type CreateOperation<T> = WithoutTimestamps<T>;
export type UpdateOperation<T> = DeepPartial<WithoutTimestamps<T>>;
export type SelectOperation<T> = T;
