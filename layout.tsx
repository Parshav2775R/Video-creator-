import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";
import { Film, Activity, ChevronRight } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();
  
  const isApiOnline = health?.status === "ok";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark">
      <header className="h-16 border-b border-white/10 glass z-50 flex items-center justify-between px-6 shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer transition-transform active:scale-95">
            <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center neon-glow">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors neon-text">AURA STUDIO</span>
          </Link>
          
          {location.startsWith("/editor") && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Project Editor</span>
            </>
          )}
          {location.startsWith("/preview") && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Compilation</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Activity className={`w-3.5 h-3.5 ${isApiOnline ? 'text-primary' : 'text-destructive animate-pulse'}`} />
            <span className={isApiOnline ? 'text-muted-foreground' : 'text-destructive'}>
              {isApiOnline ? 'API Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
