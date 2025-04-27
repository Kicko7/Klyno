"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/supabase/client"
import type { TablesInsert, Tables } from "@/supabase/types"

type Message = Tables<"messages">
type NewMessage = TablesInsert<"messages">

export default function ChatRoomPage() {
  const supabase = createClient()
  const { teamId, conversationId } = useParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!conversationId) return

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", conversationId)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setMessages(data)
        scrollToBottom()
      }

      setLoading(false)
    }

    loadMessages()

    const channel = supabase
      .channel("room:" + conversationId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${conversationId}`
        },
        payload => {
          setMessages(prev => [...prev, payload.new as Message])
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const handleSend = async () => {
    if (!newMessage.trim()) return

    const payload: NewMessage = {
      chat_id: conversationId as string,
      content: newMessage.trim(),
      role: "user",
      model: "gpt-4", // or whatever default
      user_id: "current-user", // replace with actual user context
      image_paths: [],
      sequence_number: messages.length + 1,
      created_at: new Date().toISOString()
    }

    await supabase.from("messages").insert(payload)
    setNewMessage("")
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <p>Loading messages...</p>
        ) : messages.length ? (
          messages.map(msg => (
            <div key={msg.id} className="rounded bg-gray-100 p-2 shadow-sm">
              <p className="text-sm font-semibold text-gray-700">{msg.role}</p>
              <p>{msg.content}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No messages yet.</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-white p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded border p-2"
          />
          <button
            onClick={handleSend}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
