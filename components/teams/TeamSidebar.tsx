"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "../../supabase/client" // ✅ update this if needed

interface TeamSidebarProps {
  teamId: string
}

interface Conversation {
  id: string
  title: string
}

export const TeamSidebar = ({ teamId }: TeamSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const loadConversations = async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setConversations(data)
      }
    }

    loadConversations()
  }, [teamId, supabase])

  return (
    <aside className="flex h-full w-64 flex-col justify-between border-r bg-white p-4">
      <div>
        <h2 className="mb-4 text-lg font-semibold">Team</h2>
        <ul className="space-y-2">
          {conversations.map(conv => (
            <li key={conv.id}>
              <Link
                href={`/teams/${teamId}/chat/${conv.id}`}
                className={`block rounded px-3 py-2 transition hover:bg-gray-100 ${
                  pathname.includes(conv.id)
                    ? "bg-muted text-muted-foreground"
                    : ""
                }`}
              >
                {conv.title || "Untitled"}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="text-muted-foreground mt-6 text-xs">
        <p className="mb-1">Team ID: {teamId}</p>
        <Link href={`/teams/${teamId}`}>↩ Back to Dashboard</Link>
      </div>
    </aside>
  )
}
