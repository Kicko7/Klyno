import { createClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const getMessageFileItemsByMessageId = async (messageId: string) => {
  const { data: messageFileItems, error } = await supabase
    .from("messages")
    .select(
      `
      id,
      file_items (
        id,
        name,
        type,
        size,
        created_at,
        updated_at
      )
    `
    )
    .eq("id", messageId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return messageFileItems
}

export const createMessageFileItems = async (
  messageId: string,
  fileItems: { id: string }[]
) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("User not authenticated")

  // Create the file items in the message_file_items table
  const { data: createdFileItems, error } = await supabase
    .from("message_file_items")
    .insert(
      fileItems.map(fileItem => ({
        message_id: messageId,
        file_id: fileItem.id,
        user_id: user.user.id
      }))
    )
    .select()

  if (error) {
    throw new Error(error.message)
  }

  return createdFileItems
}
