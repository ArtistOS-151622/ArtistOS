import { BrandMark } from "@/components/common/brand/brand-logo"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AppLoaderProps = {
  label?: string
  className?: string
}

export function AppLoader({ label = "Loading ArtistOS", className }: AppLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_20%_15%,#f3e8ff_0,transparent_30%),radial-gradient(circle_at_82%_12%,#ccfbf1_0,transparent_28%),#fff]",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Card className="rounded-[1.5rem] sm:rounded-3xl border-white/70 bg-white/75 px-6 py-5 sm:px-8 sm:py-7 shadow-2xl shadow-purple-950/10 backdrop-blur-xl scale-90 sm:scale-100">
        <CardContent className="flex flex-col items-center gap-3 sm:gap-4 px-0">
          <div className="relative">
            <span className="absolute inset-0 rounded-[1.25rem] sm:rounded-3xl bg-primary/20 blur-xl animate-soft-glow" />
            <BrandMark className="relative size-12 sm:size-16 rounded-[1.25rem] sm:rounded-3xl shadow-lg shadow-purple-950/10 [&_img]:size-8 sm:[&_img]:size-11" />
          </div>
          <div className="size-8 sm:size-10 rounded-full border-4 border-secondary border-t-primary animate-spin" />
          <p className="text-xs sm:text-sm font-medium text-slate-600">{label}</p>
        </CardContent>
      </Card>
    </div>
  )
}
