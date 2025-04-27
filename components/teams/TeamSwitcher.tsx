"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/supabase/client"
import type { Tables } from "@/supabase/types"

interface TeamSwitcherProps {
  currentTeamId: string
}

export const TeamSwitcher = ({ currentTeamId }: TeamSwitcherProps) => {
  const router = useRouter()
  const supabase = createClient()
  const [teams, setTeams] = useState<
    { id: string; name: string; created_at: string }[]
  >([])
  const [selectedTeamId, setSelectedTeamId] = useState(currentTeamId)

  useEffect(() => {
    const loadTeams = async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("workspace_id", currentTeamId)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setTeams(data)
      }
    }

    loadTeams()
  }, [supabase])

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeamId = e.target.value
    setSelectedTeamId(newTeamId)
    router.push(`/teams/${newTeamId}`)
  }

  if (teams.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <label className="mb-1 text-sm font-semibold text-gray-700">
          Select Workspace
        </label>
      </div>
      <select
        value={selectedTeamId}
        onChange={handleTeamChange}
        className="mt-2 block w-full rounded-lg border border-gray-300 p-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        {teams.map(team => (
          <option key={team.id} value={team.id}>
            {team.name || "Unnamed Workspace"}
          </option>
        ))}
      </select>
    </div>
  )
}
