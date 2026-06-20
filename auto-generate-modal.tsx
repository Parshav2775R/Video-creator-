import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useCreateProject, useUpdateProject, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, X, CheckCircle2, AlertCircle, Wand2, Image as ImageIcon, Mic } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface StoryScene {
  prompt: string;
  subtitle: string;
  visualEffect?: string;
  soundEffectId?: string | null;
  duration?: number;
}

interface SceneProgress {
  status: "waiting" | "image" | "audio" | "done" | "error";
  prompt: string;
  subtitle: string;
  imageUrl?: string;
  audioBase64?: string;
  error?: string;
}

interface AutoGenerateModalProps {
  open: boolean;
  projectId?: string; // if provided, append to existing project
  onClose: () => void;
}

const STYLES = [
  { value: "anime", label: "Anime", emoji: "⛩️" },
  { value: "ghibli", label: "Ghibli", emoji: "🌿" },
  { value: "cartoon", label: "3D Cartoon", emoji: "🎨" },
  { value: "pixel", label: "Pixel Art", emoji: "🕹️" },
  { value: "cinematic", label: "Cinematic", emoji: "🎬" },
];

const SCENE_COUNTS = [3, 5, 7, 10];

// ── Helpers ────────────────────────────────────────────────────────────────────
async function generateImage(prompt: string, style: string): Promise<string> {
  const res = await fetch("/api/generate/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, style }),
  });
  if (!res.ok) throw new Error("Image generation failed");
  const data = await res.json() as { imageUrl: string };
  return data.imageUrl;
}

async function generateSpeech(text: string): Promise<string> {
  const res = await fetch("/api/generate/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang: "hi" }),
  });
  if (!res.ok) throw new Error("Speech generation failed");
  const data = await res.json() as { audioBase64: string };
  return data.audioBase64;
}

async function generateStory(topic: string, numScenes: number, style: string): Promise<StoryScene[]> {
  const res = await fetch("/api/generate/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, numScenes, style }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Story generation failed" })) as { error: string };
    throw new Error(err.error || "Story generation failed");
  }
  const data = await res.json() as { scenes: StoryScene[] };
  return data.scenes;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function AutoGenerateModal({ open, projectId: initialProjectId, onClose }: AutoGenerateModalProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  // Form state
  const [topic, setTopic] = useState("");
  const [numScenes, setNumScenes] = useState(5);
  const [style, setStyle] = useState("anime");

  // Generation state
  const [phase, setPhase] = useState<"form" | "generating" | "done" | "error">("form");
  const [statusMsg, setStatusMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [sceneProgresses, setSceneProgresses] = useState<SceneProgress[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef(false);

  if (!open) return null;

  const handleClose = () => {
    abortRef.current = true;
    setPhase("form");
    setTopic("");
    setSceneProgresses([]);
    setProgress(0);
    onClose();
  };

  const updateSceneProgress = (idx: number, update: Partial<SceneProgress>) => {
    setSceneProgresses((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...update };
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    abortRef.current = false;
    setPhase("generating");
    setProgress(0);
    setSceneProgresses([]);
    setErrorMsg("");

    try {
      // ── Step 1: Create project if needed ───────────────────────────────────
      let pid = initialProjectId;
      if (!pid) {
        setStatusMsg("📁 Naya project bana raha hai...");
        const proj = await new Promise<{ id: string }>((resolve, reject) => {
          createProject.mutate(
            { data: { title: topic.slice(0, 60), scenes: [] } },
            { onSuccess: resolve, onError: reject },
          );
        });
        pid = proj.id;
      }
      if (abortRef.current) return;

      // ── Step 2: Generate story structure ──────────────────────────────────
      setStatusMsg("✍️ AI kahani likh raha hai...");
      setProgress(5);
      const storyScenes = await generateStory(topic, numScenes, style);
      if (abortRef.current) return;

      // Init progress rows
      setSceneProgresses(
        storyScenes.map((s) => ({ status: "waiting", prompt: s.prompt, subtitle: s.subtitle })),
      );
      setProgress(15);

      // ── Step 3: Generate image + audio per scene ───────────────────────────
      const builtScenes: Record<string, unknown>[] = [];
      const totalScenes = storyScenes.length;

      for (let i = 0; i < totalScenes; i++) {
        if (abortRef.current) break;
        const ss = storyScenes[i];

        setStatusMsg(`🎨 Scene ${i + 1}/${totalScenes} ka image ban raha hai...`);
        updateSceneProgress(i, { status: "image" });

        let imageUrl = "";
        try {
          imageUrl = await generateImage(ss.prompt, style);
          updateSceneProgress(i, { imageUrl });
        } catch {
          updateSceneProgress(i, { error: "Image generation failed" });
        }
        if (abortRef.current) break;

        setStatusMsg(`🎙 Scene ${i + 1}/${totalScenes} ki Hindi awaaz ban rahi hai...`);
        updateSceneProgress(i, { status: "audio" });

        let audioBase64 = "";
        try {
          if (ss.subtitle) audioBase64 = await generateSpeech(ss.subtitle);
          updateSceneProgress(i, { audioBase64 });
        } catch {
          // audio failure is non-fatal
        }

        updateSceneProgress(i, { status: "done" });
        setProgress(15 + Math.round(((i + 1) / totalScenes) * 75));

        // Build scene object
        builtScenes.push({
          id: crypto.randomUUID(),
          order: i,
          prompt: ss.prompt,
          subtitle: ss.subtitle,
          imageUrl: imageUrl || null,
          audioBase64: audioBase64 || null,
          duration: ss.duration ?? 4,
          visualEffect: ss.visualEffect ?? "none",
          soundEffectId: ss.soundEffectId ?? null,
          soundVolume: 50,
          transition: "fade",
        });

        // Save incrementally so progress is preserved
        if (!abortRef.current) {
          await new Promise<void>((resolve) => {
            updateProject.mutate(
              { id: pid!, data: { scenes: builtScenes as unknown as Parameters<typeof updateProject.mutate>[0]["data"]["scenes"] } },
              { onSuccess: () => resolve(), onError: () => resolve() },
            );
          });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(pid!) });
        }
      }

      if (abortRef.current) return;

      setProgress(100);
      setStatusMsg("✅ Sab kuch tayar hai!");
      setPhase("done");

      // Navigate to editor after brief pause
      setTimeout(() => {
        handleClose();
        setLocation(`/editor/${pid}`);
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kuch galat ho gaya";
      setErrorMsg(msg);
      setPhase("error");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={phase === "form" ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-white/8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">AI Cartoon Generator</h2>
                <p className="text-xs text-muted-foreground">Sirf topic likhein — baaki AI karega</p>
              </div>
            </div>
            {phase !== "generating" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* ── FORM ────────────────────────────────────────────────────────── */}
          {phase === "form" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">
                  Apni kahani ka topic likhein
                </label>
                <Textarea
                  placeholder={`Jaise:\n• "Ek chota bachha jo jungle mein kho gaya aur jadui dost milaye"\n• "Naruto aur Sasuke ki dosti ki kahani"\n• "Space mein ek robot ki adventure"`}
                  className="h-36 bg-black/60 border-white/10 focus-visible:ring-primary/50 text-sm resize-none placeholder:text-muted-foreground/40"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Kitne Scenes?
                  </label>
                  <div className="flex gap-2">
                    {SCENE_COUNTS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumScenes(n)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                          numScenes === n
                            ? "bg-primary/20 border-primary/50 text-primary"
                            : "bg-white/3 border-white/8 text-muted-foreground hover:border-white/20"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Art Style
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {STYLES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStyle(s.value)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          style === s.value
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-white/3 border-white/8 text-muted-foreground hover:border-white/20"
                        }`}
                      >
                        <span>{s.emoji}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className="w-full h-14 text-base font-black bg-primary hover:bg-primary/90 neon-glow disabled:opacity-40"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                ✨ AI Se Poori Cartoon Banao!
              </Button>

              <p className="text-center text-xs text-muted-foreground/50">
                {numScenes} scenes · {numScenes * 4}–{numScenes * 6} seconds · Hindi voice · Auto effects
              </p>
            </div>
          )}

          {/* ── GENERATING ──────────────────────────────────────────────────── */}
          {(phase === "generating" || phase === "done") && (
            <div className="space-y-5">
              {/* Status + Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/80 font-medium">
                    {phase === "done" ? "✅ Sab tayar!" : statusMsg}
                  </span>
                  <span className="font-mono text-primary font-bold">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-primary neon-glow transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Scene-by-scene progress */}
              {sceneProgresses.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {sceneProgresses.map((sp, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        sp.status === "done"
                          ? "border-green-500/20 bg-green-500/5"
                          : sp.status === "error"
                          ? "border-red-500/20 bg-red-500/5"
                          : sp.status === "waiting"
                          ? "border-white/5 bg-white/2 opacity-50"
                          : "border-primary/20 bg-primary/5"
                      }`}
                    >
                      {/* Status icon */}
                      <div className="shrink-0 mt-0.5">
                        {sp.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        {sp.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
                        {sp.status === "waiting" && (
                          <div className="w-4 h-4 rounded-full border border-white/20" />
                        )}
                        {(sp.status === "image" || sp.status === "audio") && (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            Scene {i + 1}
                          </span>
                          {sp.status === "image" && (
                            <span className="text-[10px] text-primary flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Image ban raha hai...
                            </span>
                          )}
                          {sp.status === "audio" && (
                            <span className="text-[10px] text-accent flex items-center gap-1">
                              <Mic className="w-3 h-3" /> Awaaz ban rahi hai...
                            </span>
                          )}
                          {sp.status === "done" && (
                            <span className="text-[10px] text-green-400">Tayar ✓</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 italic">
                          "{sp.subtitle || sp.prompt}"
                        </p>
                      </div>

                      {/* Thumbnail */}
                      {sp.imageUrl && (
                        <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                          <img src={sp.imageUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {phase === "done" && (
                <div className="text-center py-2">
                  <div className="text-2xl mb-1">🎉</div>
                  <p className="text-sm font-semibold text-green-400">
                    Editor mein ja raha hai...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── ERROR ───────────────────────────────────────────────────────── */}
          {phase === "error" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-red-300 mb-1">Kuch galat ho gaya</p>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/10" onClick={handleClose}>
                  Band Karo
                </Button>
                <Button className="flex-1 bg-primary" onClick={() => setPhase("form")}>
                  Dobara Koshish Karo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
