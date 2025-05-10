"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/supabase/client"
import type { User } from "@supabase/supabase-js"
import { getTeamMembersByUserId } from "@/db/team-members"
import { Tables } from "@/supabase/types"

type TeamMember = Tables<"team_members"> & {
  teams: { name: string } | null
  profiles: { email: string } | null
}

export const MyInvitations = () => {
  const [user, setUser] = useState<User | null>(null)
  const [invitations, setInvitations] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch current user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  // Fetch pending invitations for the current user
  useEffect(() => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .from("team_members")
      .select(
        `
        *,
        teams!team_id(name),
        profiles:profiles!invited_by(email)
      `
      )
      .eq("user_id", user.id)
      .eq("status", "pending")
      .then(({ data, error }) => {
        if (!error && data) {
          setInvitations(
            (data as any[]).filter(
              invite =>
                invite.profiles && typeof invite.profiles.email === "string"
            ) as TeamMember[]
          )
        }
        setLoading(false)
      })
  }, [user])

  // Accept invitation
  const handleAccept = async (invitationId: string) => {
    setActionLoading(invitationId)
    const supabase = createClient()
    const { error } = await supabase
      .from("team_members")
      .update({
        status: "active",
        joined_at: new Date().toISOString()
      })
      .eq("id", invitationId)
    if (!error) {
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    } else {
      alert("Failed to accept invitation.")
    }
    setActionLoading(null)
  }

  // Reject invitation
  const handleReject = async (invitationId: string) => {
    setActionLoading(invitationId)
    const supabase = createClient()
    const { error } = await supabase
      .from("team_members")
      .update({
        status: "rejected"
      })
      .eq("id", invitationId)
    if (!error) {
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    } else {
      alert("Failed to reject invitation.")
    }
    setActionLoading(null)
  }

  return (
    <div className="mx-auto mt-8 max-w-xl rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-2xl font-bold">My Team Invitations</h2>
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : invitations.length === 0 ? (
        <div className="text-center text-gray-500">No pending invitations.</div>
      ) : (
        <ul className="space-y-4">
          {invitations.map(invite => (
            <li
              key={invite.id}
              className="flex flex-col rounded border bg-gray-50 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-lg font-semibold">
                  {invite.teams?.name || "Unnamed Team"}
                </div>
                <div className="text-sm text-gray-600">
                  Invited by:{" "}
                  {invite.profiles && "email" in invite.profiles
                    ? invite.profiles.email
                    : "Unknown"}
                </div>
                <div className="text-xs text-gray-400">
                  Role: {invite.role} &middot;{" "}
                  {invite.invited_at
                    ? new Date(invite.invited_at).toLocaleString()
                    : ""}
                </div>
              </div>
              <div className="mt-4 flex gap-2 md:mt-0">
                <button
                  onClick={() => handleAccept(invite.id)}
                  disabled={actionLoading === invite.id}
                  className="rounded bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
                >
                  {actionLoading === invite.id ? "Accepting..." : "Accept"}
                </button>
                <button
                  onClick={() => handleReject(invite.id)}
                  disabled={actionLoading === invite.id}
                  className="rounded bg-red-500 px-4 py-2 text-white transition hover:bg-red-600"
                >
                  {actionLoading === invite.id ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default MyInvitations
