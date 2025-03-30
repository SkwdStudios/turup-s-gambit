"use client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface GameModeSelectorProps {
  selectedMode: string
  onSelectMode: (mode: string) => void
}

export function GameModeSelector({ selectedMode, onSelectMode }: GameModeSelectorProps) {
  return (
    <RadioGroup value={selectedMode} onValueChange={onSelectMode} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <RadioGroupItem value="classic" id="classic" className="peer sr-only" />
        <Label
          htmlFor="classic"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
        >
          <div className="mb-3 rounded-full bg-primary/20 p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M2 15h20"></path>
              <path d="M2 7h20"></path>
              <path d="M6 7v8"></path>
              <path d="M18 7v8"></path>
            </svg>
          </div>
          <div className="font-medieval text-xl mb-1">Classic</div>
          <p className="text-xs text-muted-foreground text-center">Traditional rules with standard gameplay</p>
        </Label>
      </div>

      <div>
        <RadioGroupItem value="frenzy" id="frenzy" className="peer sr-only" />
        <Label
          htmlFor="frenzy"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
        >
          <div className="mb-3 rounded-full bg-accent/20 p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
            >
              <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"></path>
              <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"></path>
              <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"></path>
            </svg>
          </div>
          <div className="font-medieval text-xl mb-1">Frenzy</div>
          <p className="text-xs text-muted-foreground text-center">Fast-paced with special powers and effects</p>
        </Label>
      </div>
    </RadioGroup>
  )
}

