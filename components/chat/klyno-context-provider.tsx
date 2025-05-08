"use client"

import { ReactNode, useState } from "react"
import { KlynoAIContext } from "@/context/context"
import { DEFAULT_VALUES } from "@/lib/default-context-values"

interface KlynoContextProviderProps {
  children: ReactNode
}

export const KlynoContextProvider = ({
  children
}: KlynoContextProviderProps) => {
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
