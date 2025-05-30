export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      assistants: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          model: string | null
          name: string
          prompt: string | null
          temperature: number | null
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          model?: string | null
          name: string
          prompt?: string | null
          temperature?: number | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          model?: string | null
          name?: string
          prompt?: string | null
          temperature?: number | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          folder: boolean | null
          id: string
          instructions: string | null
          name: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          folder?: boolean | null
          id?: string
          instructions?: string | null
          name?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          folder?: boolean | null
          id?: string
          instructions?: string | null
          name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          team_id: string | null
          title: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          team_id?: string | null
          title?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          team_id?: string | null
          title?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          id: string
          name: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string | null
          type: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          type?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          type?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_file_items: {
        Row: {
          created_at: string
          file_id: string
          message_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_id: string
          message_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_id?: string
          message_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_file_items_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_file_items_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_file_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          created_at: string | null
          id: string
          model_id: string | null
          name: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_id?: string | null
          name?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model_id?: string | null
          name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          instructions: string | null
          name: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          name?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anthropic_api_key: string | null
          avatar_url: string | null
          azure_openai_35_turbo_id: string | null
          azure_openai_45_turbo_id: string | null
          azure_openai_45_vision_id: string | null
          azure_openai_api_key: string | null
          azure_openai_embeddings_id: string | null
          azure_openai_endpoint: string | null
          bio: string
          display_name: string | null
          full_name: string | null
          google_gemini_api_key: string | null
          groq_api_key: string | null
          has_onboarded: boolean | null
          id: string
          mistral_api_key: string | null
          openai_api_key: string | null
          openrouter_api_key: string | null
          perplexity_api_key: string | null
          updated_at: string | null
          use_azure_openai: boolean | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          anthropic_api_key?: string | null
          avatar_url?: string | null
          azure_openai_35_turbo_id?: string | null
          azure_openai_45_turbo_id?: string | null
          azure_openai_45_vision_id?: string | null
          azure_openai_api_key?: string | null
          azure_openai_embeddings_id?: string | null
          azure_openai_endpoint?: string | null
          bio?: string
          display_name?: string | null
          full_name?: string | null
          google_gemini_api_key?: string | null
          groq_api_key?: string | null
          has_onboarded?: boolean | null
          id: string
          mistral_api_key?: string | null
          openai_api_key?: string | null
          openrouter_api_key?: string | null
          perplexity_api_key?: string | null
          updated_at?: string | null
          use_azure_openai?: boolean | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          anthropic_api_key?: string | null
          avatar_url?: string | null
          azure_openai_35_turbo_id?: string | null
          azure_openai_45_turbo_id?: string | null
          azure_openai_45_vision_id?: string | null
          azure_openai_api_key?: string | null
          azure_openai_embeddings_id?: string | null
          azure_openai_endpoint?: string | null
          bio?: string
          display_name?: string | null
          full_name?: string | null
          google_gemini_api_key?: string | null
          groq_api_key?: string | null
          has_onboarded?: boolean | null
          id?: string
          mistral_api_key?: string | null
          openai_api_key?: string | null
          openrouter_api_key?: string | null
          perplexity_api_key?: string | null
          updated_at?: string | null
          use_azure_openai?: boolean | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      prompts: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          id: string
          name: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chats: {
        Row: {
          context_length: number | null
          created_at: string
          created_by: string
          id: string
          model_id: string | null
          name: string
          system_prompt: string | null
          team_id: string
          temperature: number | null
          updated_at: string
        }
        Insert: {
          context_length?: number | null
          created_at?: string
          created_by: string
          id?: string
          model_id?: string | null
          name: string
          system_prompt?: string | null
          team_id: string
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          context_length?: number | null
          created_at?: string
          created_by?: string
          id?: string
          model_id?: string | null
          name?: string
          system_prompt?: string | null
          team_id?: string
          temperature?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_chats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string
          invited_by: string | null
          joined_at: string | null
          role: string | null
          status: string
          team_id: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string | null
          status?: string
          team_id?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string | null
          status?: string
          team_id?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          model_id: string | null
          role: string
          tokens: number | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          model_id?: string | null
          role: string
          tokens?: number | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          model_id?: string | null
          role?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "team_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          default_context_length: number | null
          default_model: string | null
          default_prompt: string | null
          default_temperature: number | null
          description: string | null
          embeddings_provider: string | null
          id: string
          image_path: string | null
          include_profile_context: boolean | null
          include_workspace_instructions: boolean | null
          instructions: string | null
          is_home: boolean | null
          name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          default_context_length?: number | null
          default_model?: string | null
          default_prompt?: string | null
          default_temperature?: number | null
          description?: string | null
          embeddings_provider?: string | null
          id?: string
          image_path?: string | null
          include_profile_context?: boolean | null
          include_workspace_instructions?: boolean | null
          instructions?: string | null
          is_home?: boolean | null
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          default_context_length?: number | null
          default_model?: string | null
          default_prompt?: string | null
          default_temperature?: number | null
          description?: string | null
          embeddings_provider?: string | null
          id?: string
          image_path?: string | null
          include_profile_context?: boolean | null
          include_workspace_instructions?: boolean | null
          instructions?: string | null
          is_home?: boolean | null
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      team_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      team_role: ["owner", "admin", "member"],
    },
  },
} as const
