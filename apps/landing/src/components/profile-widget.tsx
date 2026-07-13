import { profile } from "@/config/profile"

export function ProfileWidget() {
  return (
    <section
      aria-label="Profile"
      className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-lg backdrop-blur-xl"
    >
      <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
      <p className="mt-0.5 text-sm font-medium text-white/70">{profile.title}</p>
      <p className="mt-3 text-sm text-white/80">{profile.bio}</p>
    </section>
  )
}
