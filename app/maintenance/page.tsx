import { Server, Wrench, Sparkles } from "lucide-react"

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl mix-blend-multiply animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl mix-blend-multiply animate-pulse animation-delay-2000" />
      
      <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200/50 p-10 sm:p-14 rounded-[3rem] shadow-2xl max-w-lg w-full text-center space-y-8 z-10">
        
        {/* Animated Icons */}
        <div className="relative flex items-center justify-center h-24">
          <div className="absolute animate-spin-slow text-purple-200">
            <Server className="size-24 opacity-50" />
          </div>
          <div className="relative bg-purple-100 text-purple-600 p-4 rounded-3xl animate-bounce">
            <Wrench className="size-10" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="size-3 text-amber-500" />
            System Update
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            We'll be right back.
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            ArtistOS is currently undergoing scheduled maintenance to upgrade our platform features and improve your experience. 
          </p>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <p className="text-slate-400 text-xs">
            We apologize for any inconvenience. <br/>
            Please check back in a few minutes.
          </p>
        </div>
      </div>
    </div>
  )
}
