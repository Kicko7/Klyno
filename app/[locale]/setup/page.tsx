"use client"

import { useEffect, useState, useContext } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"
import { ChatbotUIContext } from "@/context/context"
import { getProfileByUserId } from "@/db/profile"
import { Tables } from "@/supabase/types"

export default function SetupPage() {
  const router = useRouter()

  const {
    setEnvKeyMap,
    setAvailableHostedModels,
    setAvailableOpenRouterModels,
    setSelectedWorkspace
  } = useContext(ChatbotUIContext)

  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Profile Step
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [usernameAvailable, setUsernameAvailable] = useState(true)

  // API Step
  const [useAzureOpenai, setUseAzureOpenai] = useState(false)
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [openaiEndpoint, setOpenaiEndpoint] = useState("")
  const [azureOpenaiApiKey, setAzureOpenaiApiKey] = useState("")
  const [azureOpenai35TurboID, setAzureOpenai35TurboID] = useState("")
  const [azureOpenai45TurboID, setAzureOpenai45TurboID] = useState("")
  const [azureOpenai45VisionID, setAzureOpenai45VisionID] = useState("")
  const [azureOpenaiEmbeddingsID, setAzureOpenaiEmbeddingsID] = useState("")
  const [anthropicApiKey, setAnthropicApiKey] = useState("")
  const [googleGeminiApiKey, setGoogleGeminiApiKey] = useState("")
  const [groqApiKey, setGroqApiKey] = useState("")
  const [mistralApiKey, setMistralApiKey] = useState("")
  const [openrouterApiKey, setOpenrouterApiKey] = useState("")
  const [perplexityApiKey, setPerplexityApiKey] = useState("")

  // Fetch session and user profile
  useEffect(() => {
    ;(async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session?.user?.id) {
          router.push("/login")
          return
        }

        const userId = session.session.user.id
        const profile = await getProfileByUserId(userId)

        if (profile) {
          setDisplayName(profile.display_name ?? "")
          setUsername(profile.username ?? "")
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      }
    })()
  }, [router])

  // Save Setup
  const handleSaveSetupSetting = async () => {
    setLoading(true)

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError || !sessionData?.session?.user?.id) {
        setLoading(false)
        throw new Error("User session not found")
      }

      const userId = sessionData.session.user.id

      // 1. Update the user profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username,
          display_name: displayName || username,
          bio: "",
          has_onboarded: true,
          openai_api_key: openaiApiKey,
          azure_openai_api_key: azureOpenaiApiKey,
          azure_openai_embeddings_id: azureOpenaiEmbeddingsID,
          azure_openai_35_turbo_id: azureOpenai35TurboID,
          azure_openai_45_turbo_id: azureOpenai45TurboID,
          azure_openai_45_vision_id: azureOpenai45VisionID,
          azure_openai_endpoint: openaiEndpoint,
          anthropic_api_key: anthropicApiKey,
          google_gemini_api_key: googleGeminiApiKey,
          groq_api_key: groqApiKey,
          mistral_api_key: mistralApiKey,
          openrouter_api_key: openrouterApiKey,
          perplexity_api_key: perplexityApiKey,
          use_azure_openai: useAzureOpenai
        })
        .eq("id", userId)

      if (profileError) {
        console.error(profileError)
        setLoading(false)
        throw new Error("Failed to update user profile")
      }

      // 2. Fetch home workspace
      const { data: homeWorkspaceIdData, error: homeWorkspaceError } =
        await supabase
          .from("workspaces")
          .select("id")
          .eq("user_id", userId)
          .eq("is_home", true)
          .maybeSingle()

      let homeWorkspaceId = homeWorkspaceIdData?.id

      // 3. If no workspace, create one
      if (!homeWorkspaceId) {
        const { data: newWorkspace, error: newWorkspaceError } = await supabase
          .from("workspaces")
          .insert([
            {
              user_id: userId,
              name: "Personal Workspace",
              is_home: true,
              default_context_length: 4096,
              default_model: "default",
              default_prompt: "",
              default_temperature: 0.7,
              description: "",
              embeddings_provider: "openai",
              include_profile_context: false,
              include_workspace_instructions: false,
              instructions: "",
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .maybeSingle()

        if (newWorkspaceError || !newWorkspace?.id) {
          console.error(newWorkspaceError)
          setLoading(false)
          throw new Error("Failed to create personal workspace")
        }

        homeWorkspaceId = newWorkspace.id
      }

      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", homeWorkspaceId)
        .maybeSingle()

      if (workspaceError || !workspace) {
        console.error(workspaceError)
        setLoading(false)
        throw new Error("Failed to fetch workspace details")
      }

      setSelectedWorkspace(workspace)
      setLoading(false)

      router.push(`/chat`)
    } catch (error) {
      console.error("Error saving setup:", error)
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      {/* Your stepper or setup form goes here */}

      {/* Save Button */}
      <button
        onClick={handleSaveSetupSetting}
        disabled={loading}
        className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        {loading ? "Saving..." : "Save and Finish Setup"}
      </button>
    </div>
  )
}
