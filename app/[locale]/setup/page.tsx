"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"
import { getProfileByUserId } from "@/db/profile"
import type { Database } from "@/supabase/types"

// Steps
const PROFILE_STEP = 1
const API_STEP = 2
const FINISH_STEP = 3

// ✅ Create Profile if missing

async function createProfileIfMissing(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (!data && !error) {
    const { error: insertError } = await supabase.from("profiles").insert([
      {
        id: userId,
        user_id: userId,
        username: userId.slice(0, 8),
        display_name: userId.slice(0, 8),
        avatar_url: "",
        bio: "", // ✅ you must have this
        image_path: "",
        image_url: "",
        profile_context: "",
        openai_api_key: null,
        anthropic_api_key: null,
        groq_api_key: null,
        mistral_api_key: null,
        openrouter_api_key: null,
        perplexity_api_key: null,
        use_azure_openai: false,
        azure_openai_api_key: null,
        azure_openai_embeddings_id: null,
        azure_openai_35_turbo_id: null,
        azure_openai_45_turbo_id: null,
        azure_openai_45_vision_id: null,
        azure_openai_endpoint: null,
        google_gemini_api_key: null,
        has_onboarded: false,
        created_at: new Date().toISOString(), // ✅ this was missing
        updated_at: new Date().toISOString() // ✅ matching expectations
      }
    ])

    if (insertError) {
      console.error("Failed to create profile automatically:", insertError)
      throw insertError
    }
  }
}

export default function SetupPage() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(PROFILE_STEP)
  const [loading, setLoading] = useState(false)

  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [usernameAvailable, setUsernameAvailable] = useState(true)

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

  // On page load
  useEffect(() => {
    ;(async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session?.user?.id) {
          return router.push("/login")
        }

        const userId = session.session.user.id

        await createProfileIfMissing(userId)

        const profile = await getProfileByUserId(userId)

        if (profile) {
          setUsername(profile.username || "")
          setDisplayName(profile.display_name || "")
        }
      } catch (error) {
        console.error("Failed loading profile:", error)
      }
    })()
  }, [router])

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
          .select("id")
          .single()

        workspaceId = newWorkspace?.id
      }

      if (workspaceId) {
        router.push(`/${workspaceId}/chat`)
      } else {
        alert("Workspace was not created. Please try again.")
      }
    } catch (error) {
      console.error("Setup error:", error)
      setLoading(false)
      alert("There was an error completing your setup.")
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {currentStep === PROFILE_STEP && (
        <>
          <h2 className="mb-4 text-xl font-semibold">Set up your profile</h2>
          <input
            className="input mb-2"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            className="input mb-4"
            placeholder="Display Name (optional)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
          <button className="btn" onClick={() => setCurrentStep(API_STEP)}>
            Next: API Keys
          </button>
        </>
      )}

      {currentStep === API_STEP && (
        <>
          <h2 className="mb-4 text-xl font-semibold">
            Enter API Keys (optional)
          </h2>
          <div className="grid grid-cols-1 gap-2">
            <input
              className="input"
              placeholder="OpenAI API Key"
              value={openaiApiKey}
              onChange={e => setOpenaiApiKey(e.target.value)}
            />
            <input
              className="input"
              placeholder="Anthropic API Key"
              value={anthropicApiKey}
              onChange={e => setAnthropicApiKey(e.target.value)}
            />
            <input
              className="input"
              placeholder="Groq API Key"
              value={groqApiKey}
              onChange={e => setGroqApiKey(e.target.value)}
            />
            <input
              className="input"
              placeholder="Mistral API Key"
              value={mistralApiKey}
              onChange={e => setMistralApiKey(e.target.value)}
            />
            <input
              className="input"
              placeholder="OpenRouter API Key"
              value={openrouterApiKey}
              onChange={e => setOpenrouterApiKey(e.target.value)}
            />
            <input
              className="input"
              placeholder="Perplexity API Key"
              value={perplexityApiKey}
              onChange={e => setPerplexityApiKey(e.target.value)}
            />
            <input
              className="input"
              placeholder="Azure OpenAI API Key"
              value={azureOpenaiApiKey}
              onChange={e => setAzureOpenaiApiKey(e.target.value)}
            />
            <input
              className="input"
              placeholder="Azure Embeddings ID"
              value={azureEmbeddingsId}
              onChange={e => setAzureEmbeddingsId(e.target.value)}
            />
            <input
              className="input"
              placeholder="Azure 35 Turbo ID"
              value={azure35TurboId}
              onChange={e => setAzure35TurboId(e.target.value)}
            />
            <input
              className="input"
              placeholder="Azure 45 Turbo ID"
              value={azure45TurboId}
              onChange={e => setAzure45TurboId(e.target.value)}
            />
            <input
              className="input"
              placeholder="Azure 45 Vision ID"
              value={azure45VisionId}
              onChange={e => setAzure45VisionId(e.target.value)}
            />
            <input
              className="input"
              placeholder="Azure Endpoint URL"
              value={azureEndpoint}
              onChange={e => setAzureEndpoint(e.target.value)}
            />
            <input
              className="input"
              placeholder="Google Gemini API Key"
              value={googleGeminiApiKey}
              onChange={e => setGoogleGeminiApiKey(e.target.value)}
            />
          </div>
          <button
            className="btn mt-4"
            onClick={() => setCurrentStep(FINISH_STEP)}
          >
            Next: Finish
          </button>
        </>
      )}

      {currentStep === FINISH_STEP && (
        <>
          <h2 className="mb-4 text-xl font-semibold">Finish Setup</h2>
          <button
            className="btn"
            disabled={loading}
            onClick={handleSaveSetupSetting}
          >
            {loading ? "Saving..." : "Save and Finish"}
          </button>
        </>
      )}
    </div>
  )
}
