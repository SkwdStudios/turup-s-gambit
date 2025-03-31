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
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent/20 hover:border-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200"
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
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent/20 hover:border-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200"
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

      {/* Add Tutorial Mode with Coming Soon label */}
      <div>
        <RadioGroupItem value="tutorial" id="tutorial" className="peer sr-only" disabled />
        <Label
          htmlFor="tutorial"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card/50 p-4 opacity-80 cursor-not-allowed relative"
        >
          <div className="mb-3 rounded-full bg-secondary/20 p-2">
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
              className="text-secondary"
            >
              <path d="M12 9V4"></path>
              <path d="M15.17 6 12 9.17 8.83 6"></path>
              <path d="m18 16-2 2-2-2"></path>
              <path d="M14 17v-4.17L12 11l-2 1.83V17"></path>
              <path d="m6 16 2 2 2-2"></path>
              <rect width="20" height="14" x="2" y="6" rx="2"></rect>
            </svg>
          </div>
          <div className="font-medieval text-xl mb-1">Tutorial</div>
          <p className="text-xs text-muted-foreground text-center">Learn the game with guided instructions</p>
          <div className="absolute bottom-2 right-2 bg-secondary/80 text-white text-xs px-2 py-1 rounded-full">
            Coming Soon
          </div>
        </Label>
      </div>

      {/* Add Tournament Mode with Coming Soon label */}
      <div>
        <RadioGroupItem value="tournament" id="tournament" className="peer sr-only" disabled />
        <Label
          htmlFor="tournament"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card/50 p-4 opacity-80 cursor-not-allowed relative"
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
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
              <path d="M4 22h16"></path>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
            </svg>
          </div>
          <div className="font-medieval text-xl mb-1">Tournament</div>
          <p className="text-xs text-muted-foreground text-center">Compete in ranked matches for glory</p>
          <div className="absolute bottom-2 right-2 bg-primary/80 text-white text-xs px-2 py-1 rounded-full">
            Coming Soon
          </div>
        </Label>
      </div>
    </RadioGroup>
  )
}

