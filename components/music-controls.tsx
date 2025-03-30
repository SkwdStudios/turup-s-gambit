"use client"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Volume2, VolumeX, Play, Pause, SkipForward, SkipBack } from "lucide-react"
import { useMusicPlayer } from "@/hooks/use-music-player"

export function MusicControls() {
  const { isPlaying, volume, isMuted, currentTrack, togglePlay, toggleMute, setVolume, nextTrack, previousTrack } =
    useMusicPlayer()

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
  }

  return (
    <div className="flex flex-col gap-4 min-w-[250px]">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Now Playing:</p>
        <p className="font-medieval">{currentTrack.title}</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={previousTrack}>
          <SkipBack size={18} />
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={togglePlay}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full" onClick={nextTrack}>
          <SkipForward size={18} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleMute}>
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-full"
        />
      </div>
    </div>
  )
}

