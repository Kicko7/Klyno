
type TeamChatMessageItem = {
    userId: string;
    id: string;
    content: string;
    metadata: {
        [key: string]: any;
        userInfo?: {
            id: string;
            username?: string;
            email?: string;
            fullName?: string;
            firstName?: string;
            lastName?: string;
            avatar?: string;
        };
        isMultiUserChat?: boolean;
        totalUsersInChat?: number;
        totalTokens?: number;
        tokens?: number;
        model?: string;
        provider?: string;
    } | null;
    accessedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    teamChatId: string;
    messageType: string | null;
    sendTime: Date;
}



export class ApiService {
  private baseUrl: string;

  constructor() {
    // Use environment variable for API base URL
    this.baseUrl = process.env.API_URL || 'http://localhost:3000';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('errorData', errorData);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Team Chat Messages API
  async getMessages(teamChatId: string, limit = 20, offset = 0): Promise<TeamChatMessageItem[]> {
    const params = new URLSearchParams({
      teamChatId,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return this.request<TeamChatMessageItem[]>(`/api/websockets/teamchat/get-messages?${params}`);
  }

  async addMessage(data: {
    id?: string;
    teamChatId: string;
    userId: string;
    content: string;
    messageType: string;
    metadata?: any;
    sendTime?: any;
  }): Promise<{ success: boolean; messageId: string }> {
    return this.request<{ success: boolean; messageId: string }>(
      '/api/websockets/teamchat/add-message',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/api/websockets/teamchat/delete-message?id=${messageId}`,
      { method: 'DELETE' },
    );
  }

  async updateMessage(messageId: string, data: { content: string; updatedAt: Date; updatedBy: string }): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/api/websockets/teamchat/update-message?id=${messageId}`,
      { method: 'PUT', body: JSON.stringify(data) },
    );
  }
}
