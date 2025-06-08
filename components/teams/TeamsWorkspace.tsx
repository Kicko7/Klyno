"use client"

import { useState } from "react"
import { TeamChatList } from "./TeamChatList"
import { TeamChat } from "./TeamChat"
import { TeamProvider } from "@/context/team-context"
// Add other team-related components as needed

interface TeamsWorkspaceProps {
  teamId: string
}

export const TeamsWorkspace = ({ teamId }: TeamsWorkspaceProps) => {
  const [selectedChatId, setSelectedChatId] = useState<string>()

  return (
    <TeamProvider teamId={teamId}>
      <div className="flex h-full">
        <div className="w-80 border-r">
          <TeamChatList
            teamId={teamId}
            onSelectChat={setSelectedChatId}
            selectedChatId={selectedChatId}
          />
        </div>
        <div className="flex-1">
          {selectedChatId ? (
            <TeamChat chatId={selectedChatId} />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Select a chat or create a new one
            </div>
          )}
        </div>
      </div>
    </TeamProvider>
  )
}
