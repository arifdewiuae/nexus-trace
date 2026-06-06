import { DEMO_PROMPTS } from "@/lib/demo-prompts"
import { ChatHero } from "./ChatHero"
import { DemoPromptButton } from "./DemoPromptButton"

type Props = {
  onPromptSelect: (prompt: string) => void
}

// Shown before the first message: welcome hero + suggested prompts.
export function EmptyState({ onPromptSelect }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <ChatHero />

      <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
        {DEMO_PROMPTS.map(({ label, prompt }) => (
          <DemoPromptButton key={prompt} label={label} prompt={prompt} onSelect={onPromptSelect} />
        ))}
      </div>
    </div>
  )
}
