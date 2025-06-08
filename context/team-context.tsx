"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/supabase/client"
import type { Tables } from "@/supabase/types"

interface TeamMessage extends Tables<"team_messages"> {}
interface TeamChat extends Tables<"team_chats"> {}

interface TeamContextValue {
  chats: TeamChat[]
  messages: TeamMessage[]
  currentChatId: string | null
  selectChat: (id: string) => void
  sendMessage: (content: string) => Promise<void>
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined)

export const useTeamContext = () => {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error("useTeamContext must be used within TeamProvider")
  return ctx
}

interface TeamProviderProps {
  teamId: string
  children: React.ReactNode
}

export const TeamProvider = ({ teamId, children }: TeamProviderProps) => {
  const supabase = createClient()
  const [chats, setChats] = useState<TeamChat[]>([])
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)

  useEffect(() => {
    const loadChats = async () => {
      const { data } = await supabase
        .from("team_chats")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })
      if (data) setChats(data as TeamChat[])
    }
    loadChats()

    const chatChannel = supabase
      .channel(`team_chats:${teamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_chats", filter: `team_id=eq.${teamId}` },
        payload => setChats(prev => [...prev, payload.new as TeamChat])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(chatChannel)
    }
  }, [teamId, supabase])

  useEffect(() => {
    if (!currentChatId) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from("team_messages")
        .select("*")
        .eq("chat_id", currentChatId)
        .order("created_at", { ascending: true })
      if (data) setMessages(data as TeamMessage[])
    }

    loadMessages()

    const messageChannel = supabase
      .channel(`team_messages:${currentChatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages", filter: `chat_id=eq.${currentChatId}` },
        payload => setMessages(prev => [...prev, payload.new as TeamMessage])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
    }
  }, [currentChatId, supabase])

  const selectChat = (id: string) => {
    setCurrentChatId(id)
  }

  const sendMessage = async (content: string) => {
    if (!currentChatId) return
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return
    await supabase.from("team_messages").insert({
      chat_id: currentChatId,
      role: "user",
      content,
      created_by: user.id
    })
  }

  return (
    <TeamContext.Provider value={{ chats, messages, currentChatId, selectChat, sendMessage }}>
      {children}
    </TeamContext.Provider>
  )
}
