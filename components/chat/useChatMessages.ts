"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/supabase/client"
import type { Tables } from "@/supabase/types" // Make sure this path matches where your types are!

export function useChatMessages(teamId: string, conversationId: string) {
  const [messages, setMessages] = useState<Tables<"messages">[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!conversationId) return

    const loadMessages = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", conversationId)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setMessages(data)
      }
      setLoading(false)
    }

    loadMessages()

    // 🔥 Real-time subscription setup
    const channel = supabase
      .channel(`chat-room-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${conversationId}`
        },
        payload => {
          const newMsg = payload.new as Tables<"messages">
          setMessages(prev => [...prev, newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return

    const { error } = await supabase.from("messages").insert({
      chat_id: conversationId,
      content: newMessage,
      role: "user",
      user_id: "", // or whoever is sending
      image_paths: [], // Default empty array
      model: "default-model", // Placeholder model name
      sequence_number: 0, // Default sequence number
      created_at: new Date().toISOString() // Current timestamp
    })

    if (!error) {
      setNewMessage("")
    }
  }

  return {
    messages,
    loading,
    newMessage,
    setNewMessage,
    sendMessage,
    bottomRef
  }
}
