import { useMode } from "@/components/utility/ModeContext"

export const ModeSwitcher = () => {
  const { mode, setMode } = useMode()
  return (
    <div className="mb-4 flex gap-2">
      <button
        className={`rounded px-4 py-2 ${mode === "personal" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        onClick={() => setMode("personal")}
      >
        Personal
      </button>
      <button
        className={`rounded px-4 py-2 ${mode === "team" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        onClick={() => setMode("team")}
      >
        Teams
      </button>
    </div>
  )
}
