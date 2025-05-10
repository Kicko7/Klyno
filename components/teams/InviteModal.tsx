"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/supabase/client"
import type { User } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"

interface InviteModalProps {
  teamId: string
}
export const InviteModal = ({ teamId }: InviteModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Ensure the current user is loaded
    if (!user) {
      alert("You must be logged in to invite members.")
      setLoading(false)
      return
    }

    try {
      // 1. Look up the invited user by email
      const { data: invitedUser, error: userError } = await createClient()
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .single()

      if (userError || !invitedUser) {
        alert("User not found.")
        setLoading(false)
        return
      }

      // 2. Check if the current user is owner/admin of the team
      const { data: membership } = await createClient()
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .single()

      if (
        !membership ||
        !membership.role ||
        !["owner", "admin"].includes(membership.role)
      ) {
        alert("You do not have permission to invite members.")
        setLoading(false)
        return
      }

      // 3. Insert the new team member with status 'pending'
      const { error: inviteError } = await createClient()
        .from("team_members")
        .insert([
          {
            id: uuidv4(),
            team_id: teamId,
            user_id: invitedUser.user_id,
            role: "member",
            status: "pending",
            invited_by: user.id,
            invited_at: new Date().toISOString()
          }
        ])

      if (!inviteError) {
        alert("Invitation sent!")
        setEmail("")
        setIsOpen(false)
      } else {
        alert("Failed to send invite.")
      }
    } catch (err) {
      alert("An error occurred.")
    }

    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
      >
        Invite User
      </button>

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">Invite a Member</h2>
            <form onSubmit={inviteUser}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="mb-4 w-full rounded border p-2"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {loading ? "Inviting..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
