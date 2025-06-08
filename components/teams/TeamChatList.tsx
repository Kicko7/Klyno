"use client"

import { createClient } from "@/supabase/client"
import { createTeamChat } from "@/db/team-chats"
import { useUser } from "@/context/user-context"
import { PlusIcon } from "@heroicons/react/24/outline"
import { v4 as uuidv4 } from "uuid"
import { useTeamContext } from "@/context/team-context"


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
  const { chats } = useTeamContext()
  const { user } = useUser()
  const supabase = createClient()
  const loading = false


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

      // new chat will be delivered via realtime listener in TeamProvider
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
