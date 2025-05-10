import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getTeamChatsByTeamId = async (teamId: string) => {
  const { data: chats, error } = await supabase
    .from("team_chats")
    .select(
      `
      *,
      profiles!created_by(email),
      team_messages(
        id,
        role,
        content,
        created_at,
        created_by,
        model_id,
        tokens,
        metadata
      )
    `
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return chats
}

export const getTeamChatById = async (chatId: string) => {
  const { data: chat, error } = await supabase
    .from("team_chats")
    .select(
      `
      *,
      profiles!created_by(email),
      team_messages(
        id,
        role,
        content,
        created_at,
        created_by,
        model_id,
        tokens,
        metadata
      )
    `
    )
    .eq("id", chatId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return chat
}

export const createTeamChat = async (chat: TablesInsert<"team_chats">) => {
  const { data: createdChat, error } = await supabase
    .from("team_chats")
    .insert([chat])
    .select(
      `
      *,
      profiles!created_by(email)
    `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdChat
}

export const updateTeamChat = async (
  chatId: string,
  chat: TablesUpdate<"team_chats">
) => {
  const { data: updatedChat, error } = await supabase
    .from("team_chats")
    .update(chat)
    .eq("id", chatId)
    .select(
      `
      *,
      profiles!created_by(email)
    `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedChat
}

export const deleteTeamChat = async (chatId: string) => {
  const { error } = await supabase.from("team_chats").delete().eq("id", chatId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const createTeamMessage = async (
  message: TablesInsert<"team_messages">
) => {
  const { data: createdMessage, error } = await supabase
    .from("team_messages")
    .insert([message])
    .select(
      `
      *,
      profiles!created_by(email)
    `
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdMessage
}

export const getTeamMessagesByChatId = async (chatId: string) => {
  const { data: messages, error } = await supabase
    .from("team_messages")
    .select(
      `
      *,
      profiles!created_by(email)
    `
    )
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return messages
}
