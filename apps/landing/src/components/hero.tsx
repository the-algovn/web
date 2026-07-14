import { profile } from "@/config/profile"

export function Hero() {
  return (
    <section className="border-b pb-10">
      <p className="text-sm text-muted-foreground">~ $ whoami</p>
      <h1 className="mt-4 text-[clamp(2.5rem,10vw,4rem)] leading-none font-bold tracking-tight">
        {profile.name}
        <span aria-hidden className="ml-2 inline-block text-primary [animation:blink_1s_step-end_infinite]">
          ▊
        </span>
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{profile.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>
    </section>
  )
}
