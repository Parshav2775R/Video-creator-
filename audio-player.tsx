import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  base64: string;
  mimeType: string;
}

export function AudioPlayer({ base64, mimeType }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!base64) return;
    const src = `data:${mimeType};base64,${base64}`;
    audioRef.current = new Audio(src);
    
    audioRef.current.addEventListener("timeupdate", () => {
      if (audioRef.current) {
        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
      }
    });

    audioRef.current.addEventListener("ended", () => {
      setIsPlaying(false);
      setProgress(0);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [base64, mimeType]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!base64) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5 w-full">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full bg-primary/20 hover:bg-primary/40 text-primary neon-glow"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </Button>
      
      <div className="flex-1 flex items-center gap-3">
        <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_8px_var(--color-primary)] transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}
