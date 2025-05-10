"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/supabase/client"
import {
  getTeamChatById,
  getTeamMessagesByChatId,
  createTeamMessage
} from "@/db/team-chats"
import { Tables } from "@/supabase/types"
import { useUser } from "@/context/user-context"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatInput } from "@/components/chat/chat-input"
import { Message } from "@/components/messages/message"

type TeamChat = Tables<"team_chats"> & {
  profiles: { id: string } | null
  team_messages: TeamMessage[]
}

type TeamMessage = Tables<"team_messages"> & {
  profiles: { id: string } | null
}

interface TeamChatProps {
  chatId: string
}

export const TeamChat = ({ chatId }: TeamChatProps) => {
  const [chat, setChat] = useState<TeamChat | null>(null)
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useUser()
  const supabase = createClient()

  // Load chat and messages
  useEffect(() => {
    const loadChat = async () => {
      try {
        const chatData = await getTeamChatById(chatId)
        setChat(chatData as unknown as TeamChat)
        const messagesData = await getTeamMessagesByChatId(chatId)
        setMessages(messagesData as unknown as TeamMessage[])
      } catch (error) {
        console.error("Error loading chat:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadChat()
  }, [chatId])

  // Subscribe to new messages
  useEffect(() => {
    if (!chatId) return

    const channel = supabase
      .channel(`team_messages:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
          filter: `chat_id=eq.${chatId}`
        },
        async payload => {
          const newMessage = payload.new as TeamMessage
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, supabase])

  const handleSendMessage = async (content: string) => {
    if (!user || !chatId) return

    try {
      const message = await createTeamMessage({
        chat_id: chatId,
        role: "user",
        content,
        created_by: user.id,
        model_id: chat?.model_id || null
      })

      setMessages(prev => [...prev, message as unknown as TeamMessage])
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  if (isLoading) {
    return <div>Loading chat...</div>
  }

  if (!chat) {
    return <div>Chat not found</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(message => (
          <Message
            key={message.id}
            message={message}
            fileItems={[]}
            isEditing={false}
            isLast={false}
            onStartEdit={() => {}}
            onCancelEdit={() => {}}
            onSubmitEdit={() => {}}
          />
        ))}
      </div>
      <div className="border-t p-4">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  )
}
