"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface Track {
  id: string;
  title: string;
  src: string;
}

interface MusicPlayerContextType {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTrack: Track;
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

const tracks: Track[] = [
  {
    id: "1",
    title: "Medieval Ballad",
    src: "/assets/music/the_noble_land.mp3",
  },
  {
    id: "2",
    title: "Tavern Songs",
    src: "/assets/music/the_noble_land.mp3", // In a real app, these would be different tracks
  },
  {
    id: "3",
    title: "Court Melodies",
    src: "/assets/music/the_noble_land.mp3", // In a real app, these would be different tracks
  },
];

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(
  undefined
);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    const audioElement = new Audio(tracks[currentTrackIndex].src);
    audioElement.loop = true;
    audioElement.volume = volume;
    setAudio(audioElement);

    // Clean up
    return () => {
      audioElement.pause();
      audioElement.src = "";
    };
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, audio]);

  const togglePlay = () => {
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audio) return;

    audio.volume = isMuted ? volume : 0;
    setIsMuted(!isMuted);
  };

  const setVolume = (newVolume: number) => {
    if (!audio) return;

    audio.volume = isMuted ? 0 : newVolume;
    setVolumeState(newVolume);
  };

  const nextTrack = () => {
    const wasPlaying = isPlaying;
    if (audio) {
      audio.pause();
    }

    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIndex);

    // We need to wait for the new audio element to be created in the useEffect
    setTimeout(() => {
      if (wasPlaying && audio) {
        audio.play();
        setIsPlaying(true);
      }
    }, 50);
  };

  const previousTrack = () => {
    const wasPlaying = isPlaying;
    if (audio) {
      audio.pause();
    }

    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(prevIndex);

    // We need to wait for the new audio element to be created in the useEffect
    setTimeout(() => {
      if (wasPlaying && audio) {
        audio.play();
        setIsPlaying(true);
      }
    }, 50);
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        isPlaying,
        volume,
        isMuted,
        currentTrack: tracks[currentTrackIndex],
        togglePlay,
        toggleMute,
        setVolume,
        nextTrack,
        previousTrack,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}
