export interface ChatMessage {
  message: {
    id: string
    chat_id: string
    assistant_id: string | null
    content: string
    created_at: string
    updated_at: string | null // was string
    image_paths: string[]
    model: string
    role: string
    sequence_number: number
    user_id: string | null // was string
  }
  fileItems: string[]
}
