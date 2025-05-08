import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { KlynoAIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useState } from "react"
import { Message } from "@/components/messages/message"
import { sanitizeMessage } from "@/components/chat/chat-helpers/sanitizeMessage"

// Define the props for this component
interface ChatMessagesProps {
  message: Tables<"messages"> // expects fully sanitized message
  fileItems: Tables<"file_items">[]
  isEditing: boolean
  isLast: boolean
  onStartEdit: (message: Tables<"messages">) => void
  onCancelEdit: () => void
  onSubmitEdit: (value: string, sequenceNumber: number) => void
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
  const messageFileItems = chatFileItems.filter(
    chatFileItem =>
      fileItems.some(item => item.file_id === chatFileItem.file_id) &&
      chatFileItem.message_id === message.id
  )

  return (
    <Message
      key={message.sequence_number}
      // Sanitize message before passing it to <Message />
      message={message}
      fileItems={messageFileItems}
      isEditing={editingMessage?.id === message.id}
      isLast={isLast}
      onStartEdit={() => setEditingMessage(message)}
      onCancelEdit={() => setEditingMessage(null)}
      onSubmitEdit={handleSendEdit}
    />
  )
}
