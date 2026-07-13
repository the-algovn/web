import { StatusBar } from "@/components/status-bar"
import { ProfileWidget } from "@/components/profile-widget"
import { AppGrid } from "@/components/app-grid"
import { Dock } from "@/components/dock"
import { AuroraBackground } from "@/components/aurora-background"

export default function Home() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_oklch(0.35_0.09_280)_0%,_oklch(0.2_0.05_270)_45%,_oklch(0.13_0.03_260)_100%)]">
      <AuroraBackground />
      <StatusBar />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 pt-4 pb-36">
        <ProfileWidget />
        <AppGrid />
      </div>
      <Dock />
    </main>
  )
}
