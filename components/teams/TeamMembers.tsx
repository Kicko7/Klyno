"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/supabase/client"

interface TeamMembersProps {
  teamId: string
}

interface TeamMember {
  id: string
  email: string
}

export const TeamMembers = ({ teamId }: TeamMembersProps) => {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("team_members")
        .select("id, email")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setMembers(data)
      }
      setLoading(false)
    }

    loadMembers()
  }, [teamId, supabase])

  if (loading) {
    return <p>Loading members...</p>
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold">Team Members</h2>
      {members.length === 0 ? (
        <p className="text-gray-500">No members yet. Invite someone!</p>
      ) : (
        <ul className="space-y-2">
          {members.map(member => (
            <li key={member.id} className="rounded-md border p-3">
              {member.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
