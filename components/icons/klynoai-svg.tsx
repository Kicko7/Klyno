import { FC } from "react"

interface KlynoAISVGProps {
  height?: number
  width?: number
  className?: string
}

export const KlynoAISVG: FC<KlynoAISVGProps> = ({
  height = 64,
  width = 64,
  className
}) => {
  return (
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 1024 1024"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00BFFF" />
          <stop offset="50%" stopColor="#DA70D6" />
          <stop offset="100%" stopColor="#FF69B4" />
        </linearGradient>
      </defs>
      <g
        transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)"
        fill="url(#gradient1)"
        stroke="none"
      >
        {/* Your path data here */}
      </g>
    </svg>
  )
}
