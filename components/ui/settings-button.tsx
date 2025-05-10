import { FC } from "react"
import { IconSettings } from "@tabler/icons-react"

export const SettingsButton: FC = () => {
  // TODO: Wire up to open your settings modal or panel
  return (
    <button
      className="rounded-full border border-gray-200 bg-white p-3 shadow-lg transition hover:bg-gray-100"
      style={{ minWidth: 48, minHeight: 48 }}
      onClick={() => alert("Open settings modal!")}
      aria-label="Open settings"
    >
      <IconSettings size={24} className="text-gray-700" />
    </button>
  )
}
