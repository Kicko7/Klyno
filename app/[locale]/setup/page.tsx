// SetupPage.tsx

// 🌍 Import libraries
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"
import { getProfileByUserId } from "@/db/profile"

// ⚖️ Define Steps
const PROFILE_STEP = 1
const API_STEP = 2
const FINISH_STEP = 3

// 📒 SetupPage Main Component
export default function SetupPage() {
  const router = useRouter()

  // ✨ State Management
  const [currentStep, setCurrentStep] = useState(PROFILE_STEP)
  const [loading, setLoading] = useState(false)

  // 🔑 Profile Fields
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [usernameAvailable, setUsernameAvailable] = useState(true)

  // 🛋️ API Key Fields
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

  // 🔢 Fetch user profile when page loads
  useEffect(() => {
    ;(async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session?.user?.id) {
          return router.push("/login")
        }

        const profile = await getProfileByUserId(session.session.user.id)

        if (profile) {
          setUsername(profile.username || "")
          setDisplayName(profile.display_name || "")
        }
      } catch (error) {
        console.error("Failed loading profile", error)
      }
    })()
  }, [router])

  // ✔️ Save Setup Handler
  const handleSaveSetupSetting = async () => {
    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.user?.id) throw new Error("Session not found")

      const userId = session.session.user.id

      // 1. Update the user profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username,
          display_name: displayName || username,
          has_onboarded: true,
          openai_api_key: openaiApiKey,
          anthropic_api_key: anthropicApiKey,
          groq_api_key: groqApiKey,
          mistral_api_key: mistralApiKey,
          openrouter_api_key: openrouterApiKey,
          perplexity_api_key: perplexityApiKey,
          use_azure_openai: useAzureOpenai,
          azure_openai_api_key: azureOpenaiApiKey,
          azure_openai_embeddings_id: azureEmbeddingsId,
          azure_openai_35_turbo_id: azure35TurboId,
          azure_openai_45_turbo_id: azure45TurboId,
          azure_openai_45_vision_id: azure45VisionId,
          azure_openai_endpoint: azureEndpoint,
          google_gemini_api_key: googleGeminiApiKey
        })
        .eq("id", userId)

      if (profileError) throw new Error("Failed to update profile")

      // 2. Create Personal Workspace if missing
      const { data: existingWorkspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", userId)
        .eq("is_home", true)
        .maybeSingle()

      let workspaceId = existingWorkspace?.id

      if (!workspaceId) {
        const { data: newWorkspace } = await supabase
          .from("workspaces")
          .insert({
            user_id: userId,
            name: "Personal Workspace",
            is_home: true,
            default_context_length: 4096,
            default_model: "gpt-3.5-turbo",
            default_prompt: "",
            default_temperature: 0.7,
            description: "My Personal Workspace",
            embeddings_provider: "openai",
            created_at: new Date().toISOString(),
            include_profile_context: false,
            include_workspace_instructions: false,
            instructions: ""
          })
          .select()
          .single()

        workspaceId = newWorkspace?.id
      }

      // 3. Redirect to workspace chat page
      if (workspaceId) {
        router.push(`/${workspaceId}/chat`)
      } else {
        throw new Error("No workspace found or created")
      }
    } catch (error) {
      console.error("Setup error:", error)
      setLoading(false)
      alert("There was an error completing your setup.")
    }
  }

  // ✨ Render Logic
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      {currentStep === PROFILE_STEP && (
        <>
          <h2 className="text-xl font-semibold">Set up your profile</h2>
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            className="input"
            placeholder="Display Name (optional)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
          <button onClick={() => setCurrentStep(API_STEP)}>
            Next: API Keys
          </button>
        </>
      )}

      {currentStep === API_STEP && (
        <>
          <h2 className="text-xl font-semibold">Enter API Keys (optional)</h2>
          <input
            className="input"
            placeholder="OpenAI API Key"
            value={openaiApiKey}
            onChange={e => setOpenaiApiKey(e.target.value)}
          />
          {/* You can add more inputs for other APIs here */}
          <button onClick={() => setCurrentStep(FINISH_STEP)}>
            Next: Finish
          </button>
        </>
      )}

      {currentStep === FINISH_STEP && (
        <>
          <h2 className="text-xl font-semibold">Finish Setup</h2>
          <button disabled={loading} onClick={handleSaveSetupSetting}>
            {loading ? "Saving..." : "Save and Finish"}
          </button>
        </>
      )}
    </div>
  )
}
