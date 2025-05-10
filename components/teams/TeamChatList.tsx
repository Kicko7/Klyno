"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/supabase/client"
import { getTeamChatsByTeamId, createTeamChat } from "@/db/team-chats"
import { Tables } from "@/supabase/types"
import { useUser } from "@/context/user-context"
import { PlusIcon } from "@heroicons/react/24/outline"
import { v4 as uuidv4 } from "uuid"

type TeamChat = Tables<"team_chats"> & {
  profiles: { email: string } | null
  team_messages: any[]
}

interface TeamChatListProps {
  teamId: string
  onSelectChat: (chatId: string) => void
  selectedChatId?: string
}

export const TeamChatList = ({
  teamId,
  onSelectChat,
  selectedChatId
}: TeamChatListProps) => {
  const [chats, setChats] = useState<TeamChat[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useUser()
  const supabase = createClient()

  // Load team chats
  useEffect(() => {
    const loadChats = async () => {
      try {
        const chatsData = await getTeamChatsByTeamId(teamId)
        // Ensure all chats have the correct shape
        setChats(
          (chatsData as any[]).map(chat => {
            let profiles: { email: string } | null = null
            if (
              chat.profiles &&
              typeof chat.profiles === "object" &&
              "email" in chat.profiles
            ) {
              profiles = { email: chat.profiles.email }
            }
            return {
              ...chat,
              profiles,
              team_messages: Array.isArray(chat.team_messages)
                ? chat.team_messages
                : []
            } as TeamChat
          }) as TeamChat[]
        )
      } catch (error) {
        console.error("Error loading chats:", error)
      } finally {
        setLoading(false)
      }
    }

    loadChats()
  }, [teamId])

  // Subscribe to new chats
  useEffect(() => {
    if (!teamId) return

    const channel = supabase
      .channel(`team_chats:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_chats",
          filter: `team_id=eq.${teamId}`
        },
        async payload => {
          const newChat = payload.new
          setChats(prev => [
            ...prev,
            {
              ...newChat,
              profiles:
                newChat.profiles &&
                typeof newChat.profiles === "object" &&
                newChat.profiles !== null &&
                "email" in (newChat.profiles as object)
                  ? { email: (newChat.profiles as any).email }
                  : null,
              team_messages: Array.isArray(newChat.team_messages)
                ? newChat.team_messages
                : []
            } as TeamChat
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, supabase])

  const handleCreateChat = async () => {
    if (!user) return

    try {
      const chat = await createTeamChat({
        id: uuidv4(),
        team_id: teamId,
        name: "New Chat",
        created_by: user.id,
        model_id: "gpt-4-1106-preview",
        system_prompt: "You are a helpful AI assistant.",
        temperature: 0.7,
        context_length: 4096
      })

      setChats(prev => [
        ...prev,
        {
          ...chat,
          profiles:
            chat.profiles &&
            typeof chat.profiles === "object" &&
            chat.profiles !== null &&
            "email" in (chat.profiles as object)
              ? { email: (chat.profiles as any).email }
              : null,
          team_messages: []
        } as TeamChat
      ])
      onSelectChat(chat.id)
    } catch (error) {
      console.error("Error creating chat:", error)
    }
  }

  if (loading) {
    return <div>Loading chats...</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">Team Chats</h2>
        <button
          onClick={handleCreateChat}
          className="rounded-full p-2 hover:bg-gray-100"
        >
          <PlusIcon className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="p-4 text-gray-500">No chats yet. Create one!</p>
        ) : (
          <ul className="space-y-1 p-2">
            {chats.map(chat => (
              <li
                key={chat.id}
                className={`cursor-pointer rounded-lg p-2 hover:bg-gray-100 ${
                  selectedChatId === chat.id ? "bg-gray-100" : ""
                }`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="font-medium">{chat.name}</div>
                <div className="text-sm text-gray-500">
                  {chat.profiles?.email || "Unknown"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
