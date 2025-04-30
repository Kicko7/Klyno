"use client"

import { useState } from "react"
import { KlynoAIContext } from "@/context/context"
import { DEFAULT_VALUES } from "@/lib/default-context-values"

export const KlynoContextProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [currentRoom, setCurrentRoom] = useState<{
    id: string
    name: string
  } | null>(null)

  return (
    <KlynoAIContext.Provider
      value={{
        ...DEFAULT_VALUES,
        currentRoom,
        setCurrentRoom
      }}
    >
      {children}
    </KlynoAIContext.Provider>
  )
}
