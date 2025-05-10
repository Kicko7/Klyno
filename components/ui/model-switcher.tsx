import { FC, useState } from "react"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "./select"
import { LLM_LIST } from "@/lib/models/llm/llm-list"

export const ModelSwitcher: FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>(
    LLM_LIST[0].modelId
  )

  return (
    <Select
      value={selectedModel}
      onValueChange={val => setSelectedModel(val as string)}
    >
      <SelectTrigger className="min-w-[140px] rounded border bg-white px-2 py-1 text-sm shadow">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LLM_LIST.map(model => (
          <SelectItem key={model.modelId} value={model.modelId}>
            {model.modelName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
