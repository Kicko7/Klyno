"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, usePathname } from "next/navigation"
import { createClient } from "@/supabase/client"
import type { Tables } from "@/supabase/types"

interface TeamChatListProps {
  teamId: string
}

export const TeamChatList = ({ teamId }: TeamChatListProps) => {
  const [chats, setChats] = useState<{ id: string; name: string }[]>([])

  const pathname = usePathname()
  const supabase = createClient()
  const params = useParams()

  useEffect(() => {
    if (!teamId) return

    const loadChats = async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, name")
        .eq("workspace_id", teamId)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setChats(data)
      }
    }

    loadChats()
  }, [teamId, supabase])

  return (
    <div className="flex flex-col space-y-2">
      <h2 className="mb-2 text-lg font-semibold">Conversations</h2>
      {chats.map(chat => (
        <Link
          key={chat.id}
          href={`/teams/${teamId}/chat/${chat.id}`}
          className={`block rounded px-3 py-2 transition hover:bg-gray-100 ${
            pathname.includes(chat.id) ? "bg-muted text-muted-foreground" : ""
          }`}
        >
          {chat.name || "Untitled Chat"}
        </Link>
      ))}
    </div>
  )
}
