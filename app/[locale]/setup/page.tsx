"use client"

// 📚 Import libraries
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"
import { getProfileByUserId } from "@/db/profile"

// 🏁 Step Constants
const PROFILE_STEP = 1
const API_STEP = 2
const FINISH_STEP = 3

// 🚀 Main SetupPage Component
export default function SetupPage() {
  const router = useRouter()

  // 🚥 State Management
  const [currentStep, setCurrentStep] = useState(PROFILE_STEP)
  const [loading, setLoading] = useState(false)

  // 👤 Profile State
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [usernameAvailable, setUsernameAvailable] = useState(true)

  // 🔑 API Keys State
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [azureOpenaiApiKey, setAzureOpenaiApiKey] = useState("")
  const [azureOpenaiEmbeddingsId, setAzureOpenaiEmbeddingsId] = useState("")
  const [azureOpenai35TurboId, setAzureOpenai35TurboId] = useState("")
  const [azureOpenai45TurboId, setAzureOpenai45TurboId] = useState("")
  const [azureOpenai45VisionId, setAzureOpenai45VisionId] = useState("")
  const [azureOpenaiEndpoint, setAzureOpenaiEndpoint] = useState("")
  const [anthropicApiKey, setAnthropicApiKey] = useState("")
  const [googleGeminiApiKey, setGoogleGeminiApiKey] = useState("")
  const [groqApiKey, setGroqApiKey] = useState("")
  const [mistralApiKey, setMistralApiKey] = useState("")
  const [openrouterApiKey, setOpenrouterApiKey] = useState("")
  const [perplexityApiKey, setPerplexityApiKey] = useState("")
  const [useAzureOpenai, setUseAzureOpenai] = useState(false)

  // 📥 Fetch profile on load
  useEffect(() => {
    ;(async () => {
      const { data: session } = await supabase.auth.getSession()

      if (!session?.session?.user?.id) {
        router.push("/login")
        return
      }

      const profile = await getProfileByUserId(session.session.user.id)

      if (profile) {
        setUsername(profile.username || "")
        setDisplayName(profile.display_name || "")
      }
    })()
  }, [router])

  // 🧠 Handle Profile Save
  const handleSaveSetup = async () => {
    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id

      if (!userId) {
        throw new Error("No user session found.")
      }

      // 📝 Update Profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username,
          display_name: displayName || username,
          has_onboarded: true,
          openai_api_key: openaiApiKey,
          azure_openai_api_key: azureOpenaiApiKey,
          azure_openai_embeddings_id: azureOpenaiEmbeddingsId,
          azure_openai_35_turbo_id: azureOpenai35TurboId,
          azure_openai_45_turbo_id: azureOpenai45TurboId,
          azure_openai_45_vision_id: azureOpenai45VisionId,
          azure_openai_endpoint: azureOpenaiEndpoint,
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
        throw new Error("Failed to update user profile.")
      }

      // 🛠 Create Personal Workspace if none exists
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
          .insert({
            user_id: userId,
            name: "Personal Workspace",
            is_home: true,
            default_context_length: 4096,
            default_model: "gpt-3.5-turbo",
            default_prompt: "",
            default_temperature: 0.7,
            description: "My personal workspace",
            embeddings_provider: "openai",
            created_at: new Date().toISOString(),
            include_profile_context: false,
            include_workspace_instructions: false,
            instructions: ""
          })
          .select()
          .single()

        if (workspaceError || !newWorkspace?.id) {
          throw new Error("Failed to create workspace.")
        }

        workspaceId = newWorkspace.id
      }

      // 🎯 Redirect to workspace
      router.push(`/${workspaceId}/chat`)
    } catch (error) {
      console.error("Setup error:", error)
      alert("There was an error completing your setup.")
    } finally {
      setLoading(false)
    }
  }

  // 🖼 SetupPage UI Render
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-white">
      {currentStep === PROFILE_STEP && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Set up your profile</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="input"
          />
          <input
            type="text"
            placeholder="Display Name (optional)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="input"
          />
          <button
            onClick={() => setCurrentStep(API_STEP)}
            className="btn-primary"
          >
            Next: API Keys
          </button>
        </div>
      )}

      {currentStep === API_STEP && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Enter API Keys (optional)</h2>
          <input
            type="text"
            placeholder="OpenAI API Key"
            value={openaiApiKey}
            onChange={e => setOpenaiApiKey(e.target.value)}
            className="input"
          />
          {/* You can add more inputs for other keys here later */}
          <button
            onClick={() => setCurrentStep(FINISH_STEP)}
            className="btn-primary"
          >
            Next: Finish
          </button>
        </div>
      )}

      {currentStep === FINISH_STEP && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Finish Setup</h2>
          <button
            onClick={handleSaveSetup}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save and Finish"}
          </button>
        </div>
      )}
    </div>
  )
}
