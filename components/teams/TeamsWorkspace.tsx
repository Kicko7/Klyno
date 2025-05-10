"use client"

import { useState, useEffect } from "react"
import { TeamChatList } from "./TeamChatList"
import { TeamChat } from "./TeamChat"
import MyInvitations from "@/components/teams/MyInvitations"
import { createTeam } from "@/db/teams"
import { useUser } from "@/context/user-context"
// Add other team-related components as needed

interface TeamsWorkspaceProps {
  teamId: string
}

export const TeamsWorkspace = ({ teamId }: TeamsWorkspaceProps) => {
  const [selectedChatId, setSelectedChatId] = useState<string>()
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [teams, setTeams] = useState<any[]>([])
  const { user } = useUser()

  useEffect(() => {
    // Fetch teams for the user (pseudo code, replace with your fetch logic)
    // setTeams(fetchedTeams)
  }, [])

  const handleCreateTeam = async () => {
    if (!user || !teamName) return
    const newTeam = await createTeam({ name: teamName })
    setTeams([...teams, newTeam])
    setShowCreateTeamModal(false)
    setTeamName("")
  }

  if (teams.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h2 className="mb-4 text-xl font-bold">No teams found</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateTeamModal(true)}
        >
          Create a Team
        </button>
        {showCreateTeamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="rounded bg-white p-6 shadow-lg">
              <h3 className="mb-2 text-lg font-bold">Create a Team</h3>
              <input
                className="mb-4 w-full border p-2"
                placeholder="Team name"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={handleCreateTeam}>
                  Create
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCreateTeamModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
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
  )
}
