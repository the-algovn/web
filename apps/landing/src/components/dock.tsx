import { Mail } from "lucide-react"
import { profile } from "@/config/profile"

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

const shortcuts = [
  {
    id: "mail",
    label: `Email ${profile.email}`,
    href: `mailto:${profile.email}`,
    gradient: "from-emerald-500 to-teal-600",
    Icon: Mail,
    external: false,
  },
  {
    id: "linkedin",
    label: "LinkedIn profile",
    href: profile.linkedin,
    gradient: "from-[#0a66c2] to-[#004182]",
    Icon: LinkedInIcon,
    external: true,
  },
]

export function Dock() {
  return (
    <nav
      aria-label="Contact"
      className="fixed inset-x-0 bottom-4 z-10 mx-auto flex w-fit items-center gap-4 rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-3 shadow-2xl backdrop-blur-xl"
    >
      {shortcuts.map(({ id, label, href, gradient, Icon, external }) => (
        <a
          key={id}
          href={href}
          aria-label={label}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg transition-transform duration-150 hover:scale-105 active:scale-90`}
        >
          <Icon className="size-7 text-white" />
        </a>
      ))}
    </nav>
  )
}
