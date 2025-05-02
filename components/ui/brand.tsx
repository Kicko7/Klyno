"use client"

import Link from "next/link"
import { FC } from "react"
import { KlynoAISVG } from "../icons/klynoai-svg"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <Link
      className="flex cursor-pointer flex-col items-center hover:opacity-50"
      href="https://www.KlynoAI.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="mb-2">
        <KlynoAISVG height={60} width={60} />
      </div>

      <div className="text-4xl font-bold tracking-wide">Chatbot UI</div>
    </Link>
  )
}
