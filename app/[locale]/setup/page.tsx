"use client"

// 📦 Import libraries
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"
import { getProfileByUserId } from "@/db/profile"
import { TablesInsert } from "@/supabase/types"

// 🧠 Define Steps
const PROFILE_STEP = 1
const API_STEP = 2
const FINISH_STEP = 3

// 🚀 Main SetupPage Component
export default function SetupPage() {
  const router = useRouter()

  // 🔥 State Management
  const [currentStep, setCurrentStep] = useState(PROFILE_STEP)
  const [loading, setLoading] = useState(false)

  // 🌟 Profile Fields
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [usernameAvailable, setUsernameAvailable] = useState(true)

  // 🔑 API Key Fields
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [azureOpenaiApiKey, setAzureOpenaiApiKey] = useState("")
  const [azureEmbeddingsId, setAzureEmbeddingsId] = useState("")
  const [azure35TurboId, setAzure35TurboId] = useState("")
  const [azure45TurboId, setAzure45TurboId] = useState("")
  const [azure45VisionId, setAzure45VisionId] = useState("")
  const [azureEndpoint, setAzureEndpoint] = useState("")
  const [anthropicApiKey, setAnthropicApiKey] = useState("")
  const [googleGeminiApiKey, setGoogleGeminiApiKey] = useState("")
  const [groqApiKey, setGroqApiKey] = useState("")
  const [mistralApiKey, setMistralApiKey] = useState("")
  const [openrouterApiKey, setOpenrouterApiKey] = useState("")
  const [perplexityApiKey, setPerplexityApiKey] = useState("")
  const [useAzureOpenai, setUseAzureOpenai] = useState(false)

  // 📡 Fetch user profile when page loads
  useEffect(() => {
    ;(async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session
        if (!session) return router.push("/login")

        const profile = await getProfileByUserId(session.user.id)

        if (profile) {
          setUsername(profile.username ?? "")
          setDisplayName(profile.display_name ?? "")
        }
      } catch (error) {
        console.error("Setup fetch error:", error)
      }
    })()
  }, [router])

  // ⚡ Handle Save Button
  const handleSaveSetupSetting = async () => {
    setLoading(true)

    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user.id) {
      setLoading(false)
      throw new Error("No user session found.")
    }

    const userId = session.user.id

    // 🛠 1. Save Profile Information
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: displayName || username,
        has_onboarded: true,
        openai_api_key: openaiApiKey,
        azure_openai_api_key: azureOpenaiApiKey,
        azure_openai_embeddings_id: azureEmbeddingsId,
        azure_openai_35_turbo_id: azure35TurboId,
        azure_openai_45_turbo_id: azure45TurboId,
        azure_openai_45_vision_id: azure45VisionId,
        azure_openai_endpoint: azureEndpoint,
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
      console.error("Profile update error:", profileError)
      setLoading(false)
      throw new Error("Failed to update profile.")
    }

    // 🛠 2. Create Home Workspace if needed
    const { data: existingWorkspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", userId)
      .eq("is_home", true)
      .maybeSingle()

    let workspaceId = existingWorkspace?.id

    if (!workspaceId) {
      const { data: newWorkspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert([
          {
            user_id: userId,
            name: "Personal Workspace",
            is_home: true,
            default_context_length: 4096,
            default_model: "",
            default_prompt: "",
            default_temperature: 0.7,
            description: "",
            embeddings_provider: "",
            include_profile_context: false,
            include_workspace_instructions: false,
            instructions: "",
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .maybeSingle()

      if (workspaceError || !newWorkspace) {
        console.error("Workspace creation error:", workspaceError)
        setLoading(false)
        throw new Error("Failed to create personal workspace.")
      }

      workspaceId = newWorkspace.id
    }

    setLoading(false)
    router.push(`/${workspaceId}/chat`)
  }

  // 🧩 Render different steps
  const renderStep = () => {
    switch (currentStep) {
      case PROFILE_STEP:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Set up your profile</h2>
            <input
              className="w-full rounded bg-gray-800 p-2 text-white"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <input
              className="w-full rounded bg-gray-800 p-2 text-white"
              placeholder="Display Name (optional)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
            <button
              onClick={() => setCurrentStep(API_STEP)}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Next: API Keys
            </button>
          </div>
        )
      case API_STEP:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">
              Enter API Keys (optional)
            </h2>
            <input
              className="w-full rounded bg-gray-800 p-2 text-white"
              placeholder="OpenAI API Key"
              value={openaiApiKey}
              onChange={e => setOpenaiApiKey(e.target.value)}
            />
            {/* Add more input fields for other API Keys similarly */}
            <button
              onClick={() => setCurrentStep(FINISH_STEP)}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Next: Finish
            </button>
          </div>
        )
      case FINISH_STEP:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Finish Setup</h2>
            <button
              onClick={handleSaveSetupSetting}
              disabled={loading}
              className="rounded bg-green-600 px-4 py-2 text-white"
            >
              {loading ? "Saving..." : "Save and Finish"}
            </button>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6">{renderStep()}</div>
    </div>
  )
}
