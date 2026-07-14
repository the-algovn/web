import { Hero } from "@/components/hero"
import { Projects } from "@/components/projects"
import { Contact } from "@/components/contact"

export default function Home() {
  return (
    <main className="relative isolate min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-30 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:60px_60px]"
      />
      <div className="mx-auto flex min-h-dvh w-full max-w-[770px] flex-col gap-10 px-6 py-12">
        <Hero />
        <Projects />
        <Contact />
        <footer className="mt-auto border-t pt-6 text-center text-xs text-muted-foreground">
          © 2026 algovn — built by duc le
        </footer>
      </div>
    </main>
  )
}
