"use client"

import { useState } from "react"
import { createClient } from "@/supabase/client"

interface InviteModalProps {
  teamId: string
}
export const InviteModal = ({ teamId }: InviteModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // In this case, you would insert a record to something like "team_members" table
    const { error } = await supabase.from("team_members").insert([
      {
        team_id: teamId,
        email: email
      }
    ])

    if (!error) {
      alert("Invitation sent!")
      setEmail("")
      setIsOpen(false)
    } else {
      alert("Failed to send invite.")
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
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
