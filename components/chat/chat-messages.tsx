import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { KlynoAIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useState } from "react"
import { Message } from "@/components/messages/message"
import { sanitizeMessage } from "@/components/chat/chat-helpers/sanitizeMessage"

// Define the props for this component
interface ChatMessagesProps {
  message: Tables<"messages">
  fileItems: Tables<"files">[]
  isEditing: boolean
  isLast: boolean
  onStartEdit: (message: Tables<"messages">) => void
  onCancelEdit: () => void
  onSubmitEdit: (value: string, sequenceNumber: number) => void
}

// Extended file type that includes all fields from the database
// (should match the one in message.tsx)
type ExtendedFile = {
  id: string
  name: string | null
  type: string
  description: string
  file_path: string
  size: number
  tokens: number
  user_id: string
  workspace_id: string | null
  folder_id: string | null
  created_at: string
  updated_at: string | null
  sharing: string
  file?: File | null
}

export const ChatMessages: FC<ChatMessagesProps> = ({
  message,
  fileItems,
  isEditing,
  isLast,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit
}) => {
  const { chatFileItems } = useContext(KlynoAIContext)
  const { handleSendEdit } = useChatHandler()
  const [editingMessage, setEditingMessage] =
    useState<Tables<"messages"> | null>(null)

  // Filter files linked to this message
  const messageFileItems: ExtendedFile[] = fileItems.map(item => ({
    id: item.id,
    name: item.name ?? "",
    type: (item as any).type ?? "",
    description: (item as any).description ?? "",
    file_path: (item as any).file_path ?? "",
    size: (item as any).size ?? 0,
    tokens: (item as any).tokens ?? 0,
    user_id: item.user_id ?? "",
    workspace_id: item.workspace_id ?? null,
    folder_id: (item as any).folder_id ?? null,
    created_at: item.created_at,
    updated_at: (item as any).updated_at ?? null,
    sharing: (item as any).sharing ?? "",
    file: undefined // or null, as appropriate
  }))

  // Wrap handleSendEdit to match the expected signature
  const handleSubmitEdit = (value: string, sequenceNumber?: number) => {
    // If sequenceNumber is undefined, pass 0 or handle accordingly
    void handleSendEdit(value, sequenceNumber ?? 0)
  }

  return (
    <Message
      key={message.id}
      message={message}
      fileItems={messageFileItems}
      isEditing={editingMessage?.id === message.id}
      isLast={isLast}
      onStartEdit={() => setEditingMessage(message)}
      onCancelEdit={() => setEditingMessage(null)}
      onSubmitEdit={handleSubmitEdit}
    />
  )
}
