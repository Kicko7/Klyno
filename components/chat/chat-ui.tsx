import Loading from "@/app/[locale]/loading"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { KlynoAIContext } from "@/context/context"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { getChatFilesByChatId } from "@/db/chat-files"
import { getChatById } from "@/db/chats"
import { getMessageFileItemsByMessageId } from "@/db/message-file-items"
import { getMessagesByChatId } from "@/db/messages"
import { getMessageImageFromStorage } from "@/db/storage/message-images"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLMID, MessageImage } from "@/types"
import { useParams } from "next/navigation"
import { FC, useContext, useEffect, useState } from "react"
import { ChatHelp } from "./chat-help"
import { useScroll } from "./chat-hooks/use-scroll"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { ChatScrollButtons } from "./chat-scroll-buttons"
import { ChatSecondaryButtons } from "./chat-secondary-buttons"
import { sanitizeMessage } from "./chat-helpers/sanitizeMessage"
import { Tables } from "@/supabase/types"
import { MessageRow } from "./chat-helpers/sanitizeMessage"

interface ChatUIProps {}

interface Message extends Tables<"messages"> {
  image_paths?: string[]
}

interface Chat extends Tables<"chats"> {
  model?: LLMID
  prompt?: string
  temperature?: number
  context_length?: number
  include_profile_context?: boolean
  include_workspace_instructions?: boolean
  embeddings_provider?: "openai" | "local"
  assistant_id?: string
}

export const ChatUI: FC<ChatUIProps> = ({}) => {
  useHotkey("o", () => handleNewChat())

  const params = useParams()

  const {
    setChatMessages,
    selectedChat,
    setSelectedChat,
    setChatSettings,
    setChatImages,
    assistants,
    setSelectedAssistant,
    setChatFileItems,
    setChatFiles,
    setShowFilesDisplay,
    setUseRetrieval,
    setSelectedTools
  } = useContext(KlynoAIContext)

  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  const {
    messagesStartRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
    setIsAtBottom,
    isAtTop,
    isAtBottom,
    isOverflowing,
    scrollToTop
  } = useScroll()

  const [loading, setLoading] = useState(true)

  const fetchMessages = async () => {
    const fetchedMessages = await getMessagesByChatId(params.chatid as string)
    const typedMessages = fetchedMessages.map(msg => ({
      ...msg,
      image_paths: (msg as any).image_paths || []
    })) as Message[]

    const imagePromises: Promise<MessageImage>[] = typedMessages.flatMap(
      message => {
        return message.image_paths
          ? message.image_paths.map(async (imagePath: string) => {
              const url = await getMessageImageFromStorage(imagePath)

              if (url) {
                const response = await fetch(url)
                const blob = await response.blob()
                const base64 = await convertBlobToBase64(blob)

                return {
                  messageId: message.id,
                  path: imagePath,
                  base64,
                  url,
                  file: null
                }
              }

              return {
                messageId: message.id,
                path: imagePath,
                base64: "",
                url,
                file: null
              }
            })
          : []
      }
    )

    const images: MessageImage[] = await Promise.all(imagePromises.flat())
    setChatImages(images)

    const messageFileItemPromises = typedMessages.map(
      async message => await getMessageFileItemsByMessageId(message.id)
    )

    const messageFileItems = await Promise.all(messageFileItemPromises)

    // Only use valid results, filter out errors
    const validFileItems = messageFileItems.filter(
      item => item && typeof item === "object" && Array.isArray(item.file_items)
    )

    const uniqueFileItems = validFileItems.flatMap(item => item.file_items)
    setChatFileItems(uniqueFileItems as any)

    const chatFiles = await getChatFilesByChatId(params.chatid as string)
    // Defensive: check if chatFiles.files exists and is an array
    const filesArray =
      chatFiles && Array.isArray((chatFiles as any).files)
        ? (chatFiles as any).files
        : []
    setChatFiles(
      filesArray.map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        file: null
      }))
    )

    setUseRetrieval(true)
    setShowFilesDisplay(true)

    const fetchedChatMessages = typedMessages.map(message => {
      return {
        message: {
          id: message.id,
          conversation_id: (message as any).conversation_id || null,
          assistant_id: (message as any).assistant_id || null,
          content: message.content || "",
          created_at: message.created_at || "",
          updated_at: (message as any).updated_at || null,
          image_paths: (message as any).image_paths || [],
          model: (message as any).model || "",
          role: (message as any).role || "user",
          sequence_number: (message as any).sequence_number || 0,
          user_id: message.user_id || null,
          workspace_id: (message as any).workspace_id || null
        },
        fileItems: validFileItems
          .filter(messageFileItem => messageFileItem.id === message.id)
          .flatMap(messageFileItem =>
            Array.isArray(messageFileItem.file_items)
              ? messageFileItem.file_items.map((fileItem: any) => fileItem.id)
              : []
          )
      }
    })

    setChatMessages(fetchedChatMessages as any)
  }

  const fetchChat = async () => {
    const chat = (await getChatById(params.chatid as string)) as Chat
    if (!chat) return

    if (chat.assistant_id) {
      const assistant = assistants.find(
        assistant => assistant.id === chat.assistant_id
      )

      if (assistant) {
        setSelectedAssistant(assistant)

        const assistantTools = await getAssistantToolsByAssistantId(
          assistant.id
        )
        if (
          assistantTools &&
          typeof assistantTools === "object" &&
          "tools" in assistantTools &&
          Array.isArray(assistantTools.tools)
        ) {
          setSelectedTools(assistantTools.tools)
        }
      }
    }

    setSelectedChat(chat)
    setChatSettings({
      model: chat.model || "gpt-3.5-turbo",
      prompt: chat.prompt || "",
      temperature: chat.temperature || 0.7,
      contextLength: chat.context_length || 4096,
      includeProfileContext: chat.include_profile_context || false,
      includeWorkspaceInstructions:
        chat.include_workspace_instructions || false,
      embeddingsProvider: chat.embeddings_provider || "openai"
    })
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchMessages()
      await fetchChat()

      scrollToBottom()
      setIsAtBottom(true)
    }

    if (params.chatid) {
      fetchData().then(() => {
        handleFocusChatInput()
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [
    params.chatid,
    fetchMessages,
    fetchChat,
    scrollToBottom,
    setIsAtBottom,
    handleFocusChatInput
  ])

  if (loading) {
    return <Loading />
  }

  return (
    <div className="relative flex h-full flex-col items-center">
      <div className="absolute left-4 top-2.5 flex justify-center">
        <ChatScrollButtons
          isAtTop={isAtTop}
          isAtBottom={isAtBottom}
          isOverflowing={isOverflowing}
          scrollToTop={scrollToTop}
          scrollToBottom={scrollToBottom}
        />
      </div>

      <div className="absolute right-4 top-1 flex h-[40px] items-center space-x-2">
        <ChatSecondaryButtons />
      </div>

      <div className="bg-secondary flex max-h-[50px] min-h-[50px] w-full items-center justify-center border-b-2 font-bold">
        <div className="max-w-[200px] truncate sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px]">
          {(selectedChat as any)?.name ||
            (selectedChat as any)?.title ||
            "Chat"}
        </div>
      </div>

      <div
        className="flex size-full flex-col overflow-auto border-b"
        onScroll={handleScroll}
      >
        <div ref={messagesStartRef} />

        <ChatMessages
          message={sanitizeMessage({
            id: "",
            content: "Loading...",
            conversation_id: null,
            created_at: new Date().toISOString(),
            user_id: "",
            chat_id: "",
            assistant_id: null,
            model: "gpt-3.5-turbo",
            role: "user",
            sequence_number: 0,
            image_paths: [],
            updated_at: null
          })}
          fileItems={[]}
          isEditing={false}
          isLast={true}
          onStartEdit={() => {}}
          onCancelEdit={() => {}}
          onSubmitEdit={() => {}}
        />

        <div ref={messagesEndRef} />
      </div>

      <div className="relative w-full min-w-[300px] items-end px-2 pb-3 pt-0 sm:w-[600px] sm:pb-8 sm:pt-5 md:w-[700px] lg:w-[700px] xl:w-[800px]">
        <ChatInput onSendMessage={() => {}} />
      </div>

      <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
        <ChatHelp />
      </div>
    </div>
  )
}
