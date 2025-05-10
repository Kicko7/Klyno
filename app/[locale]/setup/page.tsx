"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"
import { getProfileByUserId } from "@/db/profile"
import type { Database } from "@/supabase/types"
import { Tooltip } from "@/components/ui/tooltip"
import { CheckCircleIcon } from "@heroicons/react/24/solid"
import { WithTooltip } from "@/components/ui/with-tooltip"

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
    // Insert a valid profile row with all required fields
    const { error: insertError } = await supabase.from("profiles").insert([
      {
        id: userId,
        user_id: userId,
        username: userId.slice(0, 16),
        display_name: userId.slice(0, 16),
        avatar_url: "", // required, default empty
        has_onboarded: false,
        use_azure_openai: false,
        openai_api_key: null,
        anthropic_api_key: null,
        groq_api_key: null,
        mistral_api_key: null,
        openrouter_api_key: null,
        perplexity_api_key: null,
        azure_openai_api_key: null,
        azure_openai_embeddings_id: null,
        azure_openai_35_turbo_id: null,
        azure_openai_45_turbo_id: null,
        azure_openai_45_vision_id: null,
        azure_openai_endpoint: null,
        google_gemini_api_key: null
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

      console.log("Redirecting to workspace:", workspaceId)

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
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        {/* Progress Bar */}
        <div className="mb-8 flex w-full max-w-md items-center justify-between">
          <div
            className={`h-2 flex-1 rounded-full ${currentStep >= PROFILE_STEP ? "bg-blue-500" : "bg-gray-300"}`}
          ></div>
          <div
            className={`mx-2 h-2 flex-1 rounded-full ${currentStep >= API_STEP ? "bg-blue-500" : "bg-gray-300"}`}
          ></div>
          <div
            className={`h-2 flex-1 rounded-full ${currentStep >= FINISH_STEP ? "bg-blue-500" : "bg-gray-300"}`}
          ></div>
        </div>
        {currentStep === PROFILE_STEP && (
          <>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-800">
              <CheckCircleIcon className="size-6 text-blue-500" /> Set up your
              profile
            </h2>
            <input
              className="input mb-2 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <input
              className="input mb-4 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Display Name (optional)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
            <button
              className="btn w-full rounded bg-blue-500 py-2 text-white transition hover:bg-blue-600"
              onClick={() => setCurrentStep(API_STEP)}
            >
              Next: API Keys
            </button>
          </>
        )}

        {currentStep === API_STEP && (
          <>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-800">
              <CheckCircleIcon className="size-6 text-blue-500" /> Enter API
              Keys (optional)
            </h2>
            <div className="grid w-full grid-cols-1 gap-2">
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="OpenAI API Key"
                  value={openaiApiKey}
                  onChange={e => setOpenaiApiKey(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your OpenAI API key from
                      https://platform.openai.com/account/api-keys
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Anthropic API Key"
                  value={anthropicApiKey}
                  onChange={e => setAnthropicApiKey(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your Anthropic API key from
                      https://console.anthropic.com/settings/keys
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Groq API Key"
                  value={groqApiKey}
                  onChange={e => setGroqApiKey(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>Get your Groq API key from your Groq account</div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Mistral API Key"
                  value={mistralApiKey}
                  onChange={e => setMistralApiKey(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your Mistral API key from your Mistral account
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="OpenRouter API Key"
                  value={openrouterApiKey}
                  onChange={e => setOpenrouterApiKey(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your OpenRouter API key from your OpenRouter account
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Perplexity API Key"
                  value={perplexityApiKey}
                  onChange={e => setPerplexityApiKey(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your Perplexity API key from your Perplexity account
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Azure OpenAI API Key"
                  value={azureOpenaiApiKey}
                  onChange={e => setAzureOpenaiApiKey(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your Azure OpenAI API key from your Azure portal
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Azure Embeddings ID"
                  value={azureEmbeddingsId}
                  onChange={e => setAzureEmbeddingsId(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your Azure Embeddings ID from your Azure portal
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Azure 35 Turbo ID"
                  value={azure35TurboId}
                  onChange={e => setAzure35TurboId(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>Get your Azure 35 Turbo ID from your Azure portal</div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Azure 45 Turbo ID"
                  value={azure45TurboId}
                  onChange={e => setAzure45TurboId(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>Get your Azure 45 Turbo ID from your Azure portal</div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Azure 45 Vision ID"
                  value={azure45VisionId}
                  onChange={e => setAzure45VisionId(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your Azure 45 Vision ID from your Azure portal
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Azure Endpoint URL"
                  value={azureEndpoint}
                  onChange={e => setAzureEndpoint(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your Azure Endpoint URL from your Azure portal
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
              <div className="relative">
                <input
                  className="input w-full rounded border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Google Gemini API Key"
                  value={googleGeminiApiKey}
                  onChange={e => setGoogleGeminiApiKey(e.target.value)}
                  type="password"
                />
                <WithTooltip
                  display={
                    <div>
                      Get your Google Gemini API key from your Google Cloud
                      Console
                    </div>
                  }
                  trigger={
                    <span className="absolute right-2 top-2 cursor-pointer text-blue-400">
                      ?
                    </span>
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex w-full gap-2">
              <button
                className="btn w-1/2 rounded bg-gray-200 py-2 text-gray-700 transition hover:bg-gray-300"
                onClick={() => setCurrentStep(PROFILE_STEP)}
              >
                Back
              </button>
              <button
                className="btn w-1/2 rounded bg-blue-500 py-2 text-white transition hover:bg-blue-600"
                onClick={() => setCurrentStep(FINISH_STEP)}
              >
                Next: Finish
              </button>
            </div>
            <button
              className="mt-2 text-sm text-blue-500 underline"
              onClick={() => setCurrentStep(FINISH_STEP)}
            >
              Skip for now
            </button>
          </>
        )}

        {currentStep === FINISH_STEP && (
          <>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-800">
              <CheckCircleIcon className="size-6 text-green-500" /> Finish Setup
            </h2>
            <button
              className="btn w-full rounded bg-green-500 py-2 text-white transition hover:bg-green-600"
              disabled={loading}
              onClick={handleSaveSetupSetting}
            >
              {loading ? "Saving..." : "Save and Finish"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
