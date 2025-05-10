"use client"

import { TeamsWorkspace } from "@/components/teams/TeamsWorkspace"
import PersonalWorkspace from "@/components/workspace/PersonalWorkspace"
import { useParams } from "next/navigation"
import { useMode } from "@/components/utility/ModeContext"

export default function TeamPage() {
  const params = useParams()
  const teamId = params.teamId as string
  const { mode } = useMode()

  return (
    <div className="h-full">
      {mode === "personal" ? (
        <PersonalWorkspace />
      ) : teamId ? (
        <TeamsWorkspace teamId={teamId} />
      ) : (
        <div>Select a team to get started</div>
      )}
    </div>
  )
}
