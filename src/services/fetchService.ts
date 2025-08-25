import { TeamChatMessageItem } from '@/database/schemas';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export class ApiService {
  private baseUrl: string;

  constructor() {
    // Use environment variable for API base URL
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
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
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Team Chat Messages API
  async getMessages(teamChatId: string, limit = 50, offset = 0): Promise<TeamChatMessageItem[]> {
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
}
