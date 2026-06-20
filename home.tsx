import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { Plus, Video, Clock, LayoutGrid, Loader2, Sparkles, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AutoGenerateModal } from "@/components/auto-generate-modal";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const [showAutoModal, setShowAutoModal] = useState(false);

  const handleCreateBlank = () => {
    createProject.mutate(
      { data: { title: "Untitled Project", scenes: [] } },
      { onSuccess: (project) => setLocation(`/editor/${project.id}`) },
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-500/10 text-green-400 border-green-500/20";
      case "generating": return "bg-accent/10 text-accent border-accent/20";
      case "exported": return "bg-primary/10 text-primary border-primary/20";
      default: return "bg-white/5 text-muted-foreground border-white/10";
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalScenes = projects?.reduce((acc, p) => acc + (p.scenes?.length || 0), 0) || 0;

  return (
    <div className="flex-1 overflow-auto">
      {/* ── Hero Section ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute top-10 right-1/4 w-64 h-64 bg-accent/6 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 text-xs text-primary font-semibold mb-6 tracking-wide">
            <Sparkles className="w-3 h-3" /> 100% Free · No API Key Needed
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 leading-none">
            Sirf{" "}
            <span className="text-primary neon-text">Topic Likhein</span>
            <br />
            AI Cartoon Banayega
          </h1>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Scenes, images, Hindi voice, sound effects, visual effects — sab kuch AI khud karega. Aapko sirf idea dena hai.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => setShowAutoModal(true)}
              className="h-16 px-10 text-lg font-black bg-primary hover:bg-primary/90 neon-glow rounded-2xl"
            >
              <Wand2 className="w-6 h-6 mr-2" />
              ✨ AI Se Cartoon Banao
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateBlank}
              disabled={createProject.isPending}
              className="h-16 px-8 text-base border-white/10 rounded-2xl hover:bg-white/5"
            >
              {createProject.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Blank Project
            </Button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 text-xs text-muted-foreground">
            {[
              "🤖 AI Story Writer",
              "🎨 AI Image Generator",
              "🎙 Hindi Voice (TTS)",
              "🎵 13 Sound Effects",
              "🎬 7 Visual Effects",
              "📽 MP4 Export",
            ].map((f) => (
              <span
                key={f}
                className="px-3 py-1.5 rounded-full border border-white/8 bg-white/3"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats + Projects ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <Card className="glass border-white/5 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Projects</p>
              <p className="text-3xl font-black">{projects?.length || 0}</p>
            </div>
          </Card>
          <Card className="glass border-white/5 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-xl">
              <LayoutGrid className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Generated Scenes</p>
              <p className="text-3xl font-black">{totalScenes}</p>
            </div>
          </Card>
        </div>

        {/* Projects grid */}
        {projects && projects.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Aapke Projects</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-1"
                onClick={() => setShowAutoModal(true)}
              >
                <Sparkles className="w-4 h-4" /> New AI Project
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* AI Generate card */}
              <button
                onClick={() => setShowAutoModal(true)}
                className="group glass border-2 border-dashed border-primary/20 hover:border-primary/50 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 flex flex-col items-center justify-center text-center h-[200px] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Wand2 className="w-6 h-6 text-primary" />
                </div>
                <p className="font-bold text-primary">AI Se Naya Banao</p>
                <p className="text-xs text-muted-foreground mt-1">Topic likhein, AI karega</p>
              </button>

              {projects.map((project) => (
                <Link key={project.id} href={`/editor/${project.id}`}>
                  <Card className="group glass border-white/5 p-5 rounded-2xl hover:border-primary/40 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 flex flex-col h-[200px]">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline" className={getStatusColor(project.status)}>
                        {project.status.toUpperCase()}
                      </Badge>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(project.updatedAt || project.createdAt), "MMM d")}
                      </div>
                    </div>

                    <h3 className="text-base font-bold mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {project.title}
                    </h3>

                    <div className="mt-auto">
                      <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-primary/60 rounded-full"
                          style={{ width: `${Math.min(100, (project.scenes?.length || 0) * 10)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {project.scenes?.length || 0} Scenes
                        </p>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {(!projects || projects.length === 0) && (
          <div className="py-12 text-center glass rounded-2xl border border-dashed border-white/10">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-semibold mb-1">Abhi koi project nahi</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Upar "AI Se Cartoon Banao" button dabao aur apna pehla cartoon banao!
            </p>
            <Button onClick={() => setShowAutoModal(true)} className="bg-primary neon-glow">
              <Sparkles className="w-4 h-4 mr-2" /> AI Se Banao
            </Button>
          </div>
        )}
      </div>

      {/* Auto-generate modal */}
      <AutoGenerateModal
        open={showAutoModal}
        onClose={() => setShowAutoModal(false)}
      />
    </div>
  );
}
