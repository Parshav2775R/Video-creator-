import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetProject,
  useUpdateProject,
  useGenerateImage,
  useGenerateSpeech,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Image as ImageIcon,
  Mic,
  Plus,
  ArrowRight,
  Trash2,
  Pencil,
  X,
  Play,
  Pause,
  Music2,
  Sparkles,
  RefreshCw,
  Check,
  Wand2,
} from "lucide-react";
import { AudioPlayer } from "@/components/audio-player";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AutoGenerateModal } from "@/components/auto-generate-modal";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Scene {
  id: string;
  order: number;
  prompt: string;
  subtitle: string;
  imageUrl?: string | null;
  audioBase64?: string | null;
  duration?: number | null;
  soundEffectId?: string | null;
  soundVolume?: number | null;
  visualEffect?: string | null;
  transition?: string | null;
}

interface SoundEffect {
  id: string;
  name: string;
  category: string;
  emoji: string;
  duration: number;
}

type Tab = "visual" | "audio" | "effects";

const VISUAL_EFFECTS = [
  { value: "none", label: "None", icon: "⬜" },
  { value: "zoom-in", label: "Zoom In", icon: "🔍" },
  { value: "zoom-out", label: "Zoom Out", icon: "🔭" },
  { value: "pan-left", label: "Pan Left", icon: "⬅️" },
  { value: "pan-right", label: "Pan Right", icon: "➡️" },
  { value: "shake", label: "Shake", icon: "📳" },
  { value: "fade", label: "Fade In/Out", icon: "🌅" },
];

const TRANSITIONS = [
  { value: "none", label: "Cut (Instant)" },
  { value: "fade", label: "Fade" },
  { value: "dissolve", label: "Dissolve" },
];

const STYLES = [
  { value: "anime", label: "Anime" },
  { value: "ghibli", label: "Studio Ghibli" },
  { value: "cartoon", label: "3D Cartoon" },
  { value: "pixel", label: "Pixel Art" },
  { value: "sketch", label: "Pencil Sketch" },
];

// ── Sound Picker ───────────────────────────────────────────────────────────────
function SoundPicker({
  selected,
  onSelect,
  volume,
  onVolumeChange,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}) {
  const [sounds, setSounds] = useState<SoundEffect[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/sounds")
      .then((r) => r.json())
      .then(setSounds)
      .catch(() => {});
  }, []);

  const playSound = (id: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(`/api/sounds/${id}`);
    audio.volume = volume / 100;
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(id);
  };

  const categories = [...new Set(sounds.map((s) => s.category))];

  return (
    <div className="space-y-4">
      {selected && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/10 border border-accent/30">
          <span className="text-sm text-accent font-medium">
            {sounds.find((s) => s.id === selected)?.emoji}{" "}
            {sounds.find((s) => s.id === selected)?.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => onSelect(null)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Music2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground w-12">Vol {volume}%</span>
        <Slider
          value={[volume]}
          onValueChange={([v]) => onVolumeChange(v)}
          min={10}
          max={100}
          step={10}
          className="flex-1"
        />
      </div>

      <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2 font-semibold">
              {cat}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {sounds
                .filter((s) => s.category === cat)
                .map((sound) => (
                  <div
                    key={sound.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      selected === sound.id
                        ? "border-accent/60 bg-accent/10"
                        : "border-white/5 bg-white/3 hover:border-white/20"
                    }`}
                    onClick={() => onSelect(selected === sound.id ? null : sound.id)}
                  >
                    <span className="text-base leading-none">{sound.emoji}</span>
                    <span className="text-xs flex-1 truncate">{sound.name}</span>
                    <button
                      className="shrink-0 p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound(sound.id);
                      }}
                    >
                      {playingId === sound.id ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Editor ────────────────────────────────────────────────────────────────
export default function Editor() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) },
  });

  const updateProject = useUpdateProject();
  const generateImage = useGenerateImage();
  const generateSpeech = useGenerateSpeech();

  const [title, setTitle] = useState("");
  const titleInitialized = useRef(false);
  const [activeTab, setActiveTab] = useState<Tab>("visual");
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [showAutoModal, setShowAutoModal] = useState(false);

  // Scene form state
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("anime");
  const [subtitle, setSubtitle] = useState("");
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<{
    base64: string;
    mime: string;
  } | null>(null);
  const [soundEffectId, setSoundEffectId] = useState<string | null>(null);
  const [soundVolume, setSoundVolume] = useState(50);
  const [visualEffect, setVisualEffect] = useState("none");
  const [transition, setTransition] = useState("none");
  const [duration, setDuration] = useState(5);

  if (project && !titleInitialized.current) {
    setTitle(project.title);
    titleInitialized.current = true;
  }

  const clearForm = useCallback(() => {
    setPrompt("");
    setSubtitle("");
    setCurrentImage(null);
    setCurrentAudio(null);
    setSoundEffectId(null);
    setSoundVolume(50);
    setVisualEffect("none");
    setTransition("none");
    setDuration(5);
    setEditingSceneId(null);
    setActiveTab("visual");
  }, []);

  const loadScene = (scene: Scene) => {
    setEditingSceneId(scene.id);
    setPrompt(scene.prompt || "");
    setSubtitle(scene.subtitle || "");
    setCurrentImage(scene.imageUrl ?? null);
    setCurrentAudio(
      scene.audioBase64
        ? { base64: scene.audioBase64, mime: "audio/mpeg" }
        : null,
    );
    setSoundEffectId(scene.soundEffectId ?? null);
    setSoundVolume(scene.soundVolume ?? 50);
    setVisualEffect(scene.visualEffect ?? "none");
    setTransition(scene.transition ?? "none");
    setDuration(scene.duration ?? 5);
    setActiveTab("visual");
  };

  const handleTitleSave = () => {
    if (title && title !== project?.title) {
      updateProject.mutate(
        { id, data: { title } },
        {
          onSuccess: () =>
            queryClient.invalidateQueries({
              queryKey: getGetProjectQueryKey(id),
            }),
        },
      );
    }
  };

  const handleGenerateImage = () => {
    if (!prompt) return;
    generateImage.mutate(
      { data: { prompt, style } },
      {
        onSuccess: (res) => setCurrentImage(res.imageUrl),
        onError: () =>
          toast({ title: "Image generation failed", variant: "destructive" }),
      },
    );
  };

  const handleGenerateAudio = () => {
    if (!subtitle) return;
    generateSpeech.mutate(
      { data: { text: subtitle } },
      {
        onSuccess: (res) =>
          setCurrentAudio({ base64: res.audioBase64, mime: res.mimeType }),
        onError: () =>
          toast({ title: "Audio generation failed", variant: "destructive" }),
      },
    );
  };

  const buildSceneData = (baseId?: string, baseOrder?: number): Scene => ({
    id: baseId ?? crypto.randomUUID(),
    order: baseOrder ?? (project?.scenes?.length || 0),
    prompt,
    subtitle,
    imageUrl: currentImage,
    audioBase64: currentAudio?.base64 ?? null,
    duration,
    soundEffectId,
    soundVolume,
    visualEffect,
    transition,
  });

  const handleAddScene = () => {
    if (!project) return;
    if (!currentImage) {
      toast({ title: "Image generate karo pehle", variant: "destructive" });
      return;
    }
    const newScene = buildSceneData();
    updateProject.mutate(
      { id, data: { scenes: [...(project.scenes || []), newScene] } },
      {
        onSuccess: () => {
          clearForm();
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          toast({ title: "✅ Scene add ho gaya!" });
        },
      },
    );
  };

  const handleUpdateScene = () => {
    if (!project || !editingSceneId) return;
    const existing = project.scenes.find((s) => s.id === editingSceneId);
    if (!existing) return;
    const updated = buildSceneData(editingSceneId, existing.order);
    const updatedScenes = project.scenes.map((s) =>
      s.id === editingSceneId ? updated : s,
    );
    updateProject.mutate(
      { id, data: { scenes: updatedScenes } },
      {
        onSuccess: () => {
          clearForm();
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          toast({ title: "✅ Scene update ho gaya!" });
        },
      },
    );
  };

  const handleDeleteScene = (sceneId: string) => {
    if (!project) return;
    const updated = project.scenes
      .filter((s) => s.id !== sceneId)
      .map((s, i) => ({ ...s, order: i }));
    updateProject.mutate(
      { id, data: { scenes: updated } },
      {
        onSuccess: () => {
          if (editingSceneId === sceneId) clearForm();
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        },
      },
    );
  };

  if (isLoading || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEditing = !!editingSceneId;
  const isBusy = generateImage.isPending || generateSpeech.isPending || updateProject.isPending;

  // ── Tab content ──────────────────────────────────────────────────────────────
  const tabVisual = (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Scene Description
        </label>
        <Textarea
          placeholder="e.g. एक खूबसूरत राजमहल, रात की रोशनी में..."
          className="h-28 bg-black/50 border-white/10 focus-visible:ring-primary/50 text-sm resize-none"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>
      <div className="flex gap-3 items-end">
        <div className="space-y-2 flex-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Art Style
          </label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger className="bg-black/50 border-white/10 focus:ring-primary/50 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10 text-foreground">
              {STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="h-9 px-5 bg-white text-black hover:bg-white/90 font-bold shrink-0"
          onClick={handleGenerateImage}
          disabled={generateImage.isPending || !prompt}
        >
          {generateImage.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : currentImage ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 mr-1" /> Generate
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const tabAudio = (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Hindi Dialogue / Subtitle
        </label>
        <Textarea
          placeholder="यहाँ Hindi में dialogue लिखें..."
          className="h-24 bg-black/50 border-white/10 focus-visible:ring-accent/50 text-sm resize-none"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="border-accent/30 text-accent hover:bg-accent/10"
            onClick={handleGenerateAudio}
            disabled={generateSpeech.isPending || !subtitle}
          >
            {generateSpeech.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Mic className="w-4 h-4 mr-1" />
            )}
            {currentAudio ? "Re-generate Voice" : "Generate Hindi Voice"}
          </Button>
        </div>
      </div>

      <div className="border-t border-white/5 pt-5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
          🎵 Sound Effects
        </label>
        <SoundPicker
          selected={soundEffectId}
          onSelect={setSoundEffectId}
          volume={soundVolume}
          onVolumeChange={setSoundVolume}
        />
      </div>
    </div>
  );

  const tabEffects = (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          ⏱ Duration
        </label>
        <div className="flex items-center gap-4">
          <Slider
            value={[duration]}
            onValueChange={([v]) => setDuration(v)}
            min={1}
            max={10}
            step={0.5}
            className="flex-1"
          />
          <span className="w-14 text-right text-sm font-mono font-bold text-primary">
            {duration}s
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          🎬 Visual Effect
        </label>
        <div className="grid grid-cols-2 gap-2">
          {VISUAL_EFFECTS.map((e) => (
            <button
              key={e.value}
              onClick={() => setVisualEffect(e.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                visualEffect === e.value
                  ? "border-primary/60 bg-primary/10 text-primary font-semibold"
                  : "border-white/8 bg-white/3 hover:border-white/20 text-muted-foreground"
              }`}
            >
              <span>{e.icon}</span>
              <span>{e.label}</span>
              {visualEffect === e.value && (
                <Check className="w-3 h-3 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          🔀 Transition to Next Scene
        </label>
        <Select value={transition} onValueChange={setTransition}>
          <SelectTrigger className="bg-black/50 border-white/10 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10 text-foreground">
            {TRANSITIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-14 border-b border-white/10 shrink-0 px-4 flex items-center justify-between glass z-10">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            className="w-56 bg-transparent border-transparent hover:border-white/10 focus:border-primary text-base font-semibold px-2 h-8 rounded-md shadow-none"
          />
          {isEditing && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
              Editing Scene
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 text-primary hover:bg-primary/10 h-9 font-bold"
            onClick={() => setShowAutoModal(true)}
          >
            <Wand2 className="w-4 h-4 mr-1.5" />
            AI Se Banao
          </Button>
          <Button
            onClick={() => setLocation(`/preview/${id}`)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow font-bold h-9"
            disabled={!project.scenes || project.scenes.length === 0}
          >
            Preview & Export <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Timeline */}
        <div className="w-72 border-r border-white/10 bg-black/40 flex flex-col">
          <div className="p-3 border-b border-white/10 shrink-0 flex items-center justify-between">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Timeline
            </h2>
            <Badge variant="secondary" className="bg-white/5 text-xs">
              {project.scenes?.length || 0} Scenes
            </Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {(project.scenes as unknown as Scene[])?.map((scene, idx) => (
              <div
                key={scene.id}
                className={`group relative bg-card border rounded-xl overflow-hidden shadow-lg transition-all cursor-pointer ${
                  editingSceneId === scene.id
                    ? "border-amber-500/50 shadow-amber-500/10"
                    : "border-white/5 hover:border-white/20"
                }`}
                onClick={() => {
                  if (editingSceneId === scene.id) clearForm();
                  else loadScene(scene);
                }}
              >
                {/* Scene number */}
                <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 text-[10px] font-mono font-bold border border-white/10">
                  {idx + 1}
                </div>
                {/* Edit/Delete buttons */}
                <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="w-6 h-6 rounded bg-amber-500/80 hover:bg-amber-500 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadScene(scene);
                    }}
                  >
                    <Pencil className="w-3 h-3 text-white" />
                  </button>
                  <button
                    className="w-6 h-6 rounded bg-red-500/80 hover:bg-red-500 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScene(scene.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
                {/* Thumbnail */}
                <div className="aspect-video bg-black/50 relative">
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt={scene.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                      <ImageIcon className="w-6 h-6 opacity-20" />
                    </div>
                  )}
                  {/* Effect badge */}
                  {scene.visualEffect && scene.visualEffect !== "none" && (
                    <div className="absolute bottom-1 left-1 bg-primary/80 text-[9px] px-1.5 py-0.5 rounded font-mono">
                      {VISUAL_EFFECTS.find((e) => e.value === scene.visualEffect)?.icon}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-[11px] text-muted-foreground line-clamp-1 italic mb-1">
                    "{scene.subtitle || "No subtitle"}"
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                      {scene.duration ?? 5}s
                    </span>
                    {scene.audioBase64 && (
                      <span className="text-[10px] text-accent/80 flex items-center gap-0.5">
                        <Mic className="w-2.5 h-2.5" /> Voice
                      </span>
                    )}
                    {scene.soundEffectId && (
                      <span className="text-[10px] text-purple-400/80 flex items-center gap-0.5">
                        <Music2 className="w-2.5 h-2.5" /> SFX
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!project.scenes || project.scenes.length === 0) && (
              <div className="text-center py-10 px-3 border-2 border-dashed border-white/10 rounded-xl text-muted-foreground text-xs">
                Koi scene nahi. Naya scene center panel se banao.
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Creator / Editor */}
        <div className="flex-1 border-r border-white/10 bg-black/20 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="shrink-0 border-b border-white/10 px-4 pt-3 flex items-center gap-1">
            {(
              [
                { id: "visual", label: "🎨 Visual", icon: ImageIcon },
                { id: "audio", label: "🎙 Audio & SFX", icon: Mic },
                { id: "effects", label: "✨ Effects", icon: Sparkles },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="max-w-xl mx-auto">
              {activeTab === "visual" && tabVisual}
              {activeTab === "audio" && tabAudio}
              {activeTab === "effects" && tabEffects}

              {/* Action buttons */}
              <div className="mt-8 space-y-3">
                {isEditing ? (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleUpdateScene}
                      disabled={isBusy}
                      className="flex-1 h-12 font-bold bg-amber-500 text-black hover:bg-amber-400"
                    >
                      {updateProject.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Scene Update Karo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearForm}
                      className="h-12 px-5 border-white/10"
                    >
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleAddScene}
                    disabled={!currentImage || isBusy}
                    className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90 neon-glow"
                  >
                    {updateProject.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Timeline Mein Add Karo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="w-[340px] bg-black/80 flex flex-col">
          <div className="p-3 border-b border-white/10 shrink-0">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Preview
            </h2>
          </div>
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            {/* Image preview */}
            <div className="aspect-square bg-card rounded-xl border border-white/10 overflow-hidden relative shadow-2xl">
              {generateImage.isPending ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
                  <p className="text-primary font-bold tracking-widest uppercase text-xs neon-text animate-pulse">
                    Generating...
                  </p>
                </div>
              ) : currentImage ? (
                <img
                  src={currentImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                  <ImageIcon className="w-10 h-10 mb-3 opacity-15" />
                  <p className="text-xs">Image generate karo</p>
                </div>
              )}
              {/* Effect chip */}
              {visualEffect !== "none" && (
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-primary border border-primary/30">
                  {VISUAL_EFFECTS.find((e) => e.value === visualEffect)?.icon}{" "}
                  {VISUAL_EFFECTS.find((e) => e.value === visualEffect)?.label}
                </div>
              )}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground/90 italic">
                {subtitle}
              </div>
            )}

            {/* Audio player */}
            {generateSpeech.isPending ? (
              <div className="p-3 rounded-lg bg-white/5 border border-accent/20 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-xs text-accent">Voice ban raha hai...</span>
              </div>
            ) : currentAudio ? (
              <AudioPlayer base64={currentAudio.base64} mimeType={currentAudio.mime} />
            ) : null}

            {/* SFX indicator */}
            {soundEffectId && (
              <div className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 text-xs text-purple-300">
                <Music2 className="w-3.5 h-3.5" />
                <span>Sound effect added</span>
              </div>
            )}

            {/* Info chips */}
            <div className="flex flex-wrap gap-2">
              <div className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-mono text-muted-foreground border border-white/5">
                ⏱ {duration}s
              </div>
              {transition !== "none" && (
                <div className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-mono text-muted-foreground border border-white/5">
                  🔀 {TRANSITIONS.find((t) => t.value === transition)?.label}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Auto-Generate Modal */}
      <AutoGenerateModal
        open={showAutoModal}
        projectId={id}
        onClose={() => {
          setShowAutoModal(false);
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        }}
      />
    </div>
  );
}
