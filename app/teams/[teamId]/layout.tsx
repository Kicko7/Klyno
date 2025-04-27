// app/teams/[teamId]/layout.tsx

import { ReactNode } from "react"

export default function TeamLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col">{children}</div>
}
