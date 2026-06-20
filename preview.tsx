import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetProject, useCompileVideo, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2, Film, Download, PlayCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Preview() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) }
  });

  const compileVideo = useCompileVideo();
  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);
  
  // Fake progress state
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (compileVideo.isPending) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(p => {
          // Slow down as it gets closer to 95%
          const increment = (95 - p) * 0.1;
          return p + Math.max(0.5, increment);
        });
      }, 500);
    } else {
      if (compiledVideoUrl) setProgress(100);
    }
    return () => clearInterval(interval);
  }, [compileVideo.isPending, compiledVideoUrl]);

  const handleCompile = () => {
    if (!project || !project.scenes) return;
    
    compileVideo.mutate({ data: { projectId: id, scenes: project.scenes } }, {
      onSuccess: (res) => {
        setCompiledVideoUrl(res.videoUrl);
        setProgress(100);
        toast({ title: "Video compiled successfully!" });
      },
      onError: () => {
        toast({ title: "Compilation failed", variant: "destructive" });
        setProgress(0);
      }
    });
  };

  const handleDownload = () => {
    if (!compiledVideoUrl) return;
    const a = document.createElement('a');
    a.href = compiledVideoUrl;
    a.download = `${project?.title || 'cartoon'}.mp4`;
    a.click();
  };

  if (isLoading || !project) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 lg:p-12 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Final Review: {project.title}</h1>
        <p className="text-muted-foreground">Review your storyboard and compile it into a cinematic MP4.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Storyboard */}
        <div className="col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Storyboard Sequence
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {project.scenes?.map((scene, idx) => (
              <div key={scene.id} className="bg-card rounded-xl border border-white/5 overflow-hidden shadow-lg relative">
                <div className="absolute top-2 left-2 z-10 bg-black/80 rounded px-2 py-0.5 text-[10px] font-mono font-bold text-white border border-white/10">
                  SCENE {idx + 1}
                </div>
                <div className="aspect-video bg-black/50">
                  {scene.imageUrl ? (
                    <img src={scene.imageUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">No Image</div>
                  )}
                </div>
                <div className="p-3 text-xs">
                  <p className="line-clamp-2 italic text-muted-foreground">"{scene.subtitle}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Render & Player */}
        <div className="space-y-6 flex flex-col">
          <div className="glass p-6 rounded-2xl border-white/10 sticky top-24">
            {compiledVideoUrl ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-green-400 font-bold bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                  Render Complete
                </div>
                <div className="aspect-video rounded-xl overflow-hidden border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] bg-black">
                  <video 
                    src={compiledVideoUrl} 
                    controls 
                    className="w-full h-full object-contain"
                    autoPlay
                  />
                </div>
                <Button 
                  onClick={handleDownload}
                  className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 neon-glow"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download MP4
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center p-8 bg-black/40 rounded-xl border border-white/5">
                  <PlayCircle className="w-16 h-16 text-muted-foreground opacity-20 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">Ready to master</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">{project.scenes?.length} scenes to process</p>
                </div>
                
                {compileVideo.isPending && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-primary">
                      <span>COMPILING...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/10">
                      <div 
                        className="h-full bg-primary neon-glow shadow-[0_0_10px_var(--color-primary)] transition-all duration-300 ease-out" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleCompile}
                  disabled={compileVideo.isPending || !project.scenes || project.scenes.length === 0}
                  className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-white/90"
                >
                  {compileVideo.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><Film className="w-5 h-5 mr-2" /> Start Render</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
