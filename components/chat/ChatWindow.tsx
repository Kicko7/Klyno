"use client"

import { LoadingSkeleton } from "./LoadingSkeleton"
import { useChatMessages } from "./useChatMessages"

interface ChatWindowProps {
  teamId: string
  conversationId: string
}

export const ChatWindow = ({ teamId, conversationId }: ChatWindowProps) => {
  const {
    messages,
    loading,
    newMessage,
    setNewMessage,
    sendMessage,
    bottomRef
  } = useChatMessages(teamId, conversationId)

  if (!conversationId) return null

  return (
    <div className="flex flex-1 flex-col p-6">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          messages.map(message => (
            <div key={message.id} className="mb-2">
              <strong>{message.role}</strong>: {message.content}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message form */}
      <form
        className="mt-4 flex"
        onSubmit={e => {
          e.preventDefault()
          sendMessage()
        }}
      >
        <input
          className="flex-1 rounded border p-2"
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button
          className="ml-2 rounded bg-blue-500 p-2 text-white"
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  )
}
