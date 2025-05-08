"use client"

import { Dashboard } from "@/components/ui/dashboard"
import { KlynoAIContext } from "@/context/context"
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { getModelWorkspacesByWorkspaceId } from "@/db/models"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images"
import { getToolWorkspacesByWorkspaceId } from "@/db/tools"
import { getWorkspaceById } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { supabase } from "@/lib/supabase/browser-client"
import { LLMID } from "@/types"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ReactNode, useCallback, useContext, useEffect, useState } from "react"
import Loading from "../loading"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()

  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceid as string

  const {
    setChatSettings,
    setAssistants,
    setAssistantImages,
    setChats,
    setCollections,
    setFolders,
    setFiles,
    setPresets,
    setPrompts,
    setTools,
    setModels,
    setSelectedWorkspace,
    setSelectedChat,
    setChatMessages,
    setUserInput,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay
  } = useContext(KlynoAIContext)

  const [loading, setLoading] = useState(true)

  // Fetch all workspace-related data and initialize chat settings
  const fetchWorkspaceData = useCallback(
    async (workspaceId: string) => {
      setLoading(true)

      // Fetch workspace details
      const workspace = await getWorkspaceById(workspaceId)
      setSelectedWorkspace(workspace)

      // Fetch assistants and their images
      const assistantData =
        await getAssistantWorkspacesByWorkspaceId(workspaceId)
      setAssistants(assistantData.assistants)

      for (const assistant of assistantData.assistants) {
        let url = ""

        if (assistant.image_path) {
          url = (await getAssistantImageFromStorage(assistant.image_path)) || ""
        }

        if (url) {
          const response = await fetch(url)
          const blob = await response.blob()
          const base64 = await convertBlobToBase64(blob)

          setAssistantImages(prev => [
            ...prev,
            {
              assistantId: assistant.id,
              path: assistant.image_path,
              base64,
              url
            }
          ])
        } else {
          setAssistantImages(prev => [
            ...prev,
            {
              assistantId: assistant.id,
              path: assistant.image_path,
              base64: "",
              url
            }
          ])
        }
      }

      // Fetch all workspace resources
      const chats = await getChatsByWorkspaceId(workspaceId)
      setChats(chats)

      const collectionData =
        await getCollectionWorkspacesByWorkspaceId(workspaceId)
      setCollections(collectionData.collections)

      const folders = await getFoldersByWorkspaceId(workspaceId)
      setFolders(folders)

      const fileData = await getFileWorkspacesByWorkspaceId(workspaceId)
      setFiles(fileData.files)

      const presetData = await getPresetWorkspacesByWorkspaceId(workspaceId)
      setPresets(presetData.presets)

      const promptData = await getPromptWorkspacesByWorkspaceId(workspaceId)
      setPrompts(promptData.prompts)

      const toolData = await getToolWorkspacesByWorkspaceId(workspaceId)
      setTools(toolData.tools)

      const modelData = await getModelWorkspacesByWorkspaceId(workspaceId)
      setModels(modelData.models)

      // Initialize chat settings with workspace defaults or URL parameters
      setChatSettings({
        model: (searchParams.get("model") ||
          workspace?.default_model ||
          "gpt-4-1106-preview") as LLMID,
        prompt:
          workspace?.default_prompt ||
          "You are a friendly, helpful AI assistant.",
        temperature: workspace?.default_temperature || 0.5,
        contextLength: workspace?.default_context_length || 4096,
        includeProfileContext: workspace?.include_profile_context || true,
        includeWorkspaceInstructions:
          workspace?.include_workspace_instructions || true,
        embeddingsProvider:
          (workspace?.embeddings_provider as "openai" | "local") || "openai"
      })

      setLoading(false)
    },
    [
      setChatSettings,
      setAssistants,
      setAssistantImages,
      setChats,
      setCollections,
      setFolders,
      setFiles,
      setPresets,
      setPrompts,
      setTools,
      setModels,
      setSelectedWorkspace,
      searchParams
    ]
  )

  // Check authentication and load workspace data on initial render
  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session

      if (!session) {
        return router.push("/login")
      } else {
        await fetchWorkspaceData(workspaceId)
      }
    })()
  }, [fetchWorkspaceData, router, workspaceId])

  // Reset state and reload workspace data when workspace changes
  useEffect(() => {
    ;(async () => await fetchWorkspaceData(workspaceId))()

    // Reset chat state when switching workspaces
    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
  }, [
    workspaceId,
    fetchWorkspaceData,
    setUserInput,
    setChatMessages,
    setSelectedChat,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay
  ])

  if (loading) {
    return <Loading />
  }

  return <Dashboard>{children}</Dashboard>
}
