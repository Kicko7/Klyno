// components/chat/chat-helpers/sanitizeMessage.ts

export type MessageRow = {
  id: string
  chat_id: string
  assistant_id: string | null
  user_id: string
  content: string
  created_at: string
  updated_at: string | null
  model: string
  role: string
  image_paths: string[]
  sequence_number: number
  conversation_id: string | null
}

type PartialMessageRow = Partial<MessageRow>

export const sanitizeMessage = (message: PartialMessageRow): MessageRow => {
  return {
    id: message.id ?? "temp-id",
    chat_id: message.chat_id ?? "",
    assistant_id: message.assistant_id ?? null,
    user_id: message.user_id ?? "",
    content: message.content ?? "",
    created_at: message.created_at ?? new Date().toISOString(),
    updated_at: message.updated_at ?? null,
    model: message.model ?? "gpt-4",
    role: message.role ?? "user",
    image_paths: message.image_paths ?? [],
    sequence_number: message.sequence_number ?? 0,
    conversation_id: message.conversation_id ?? null
  }
}
