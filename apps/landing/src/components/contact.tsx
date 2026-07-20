import { Button } from "@algovn/ui/button"
import { profile } from "@/config/profile"

export function Contact() {
  return (
    <section>
      <p className="text-sm text-muted-foreground">~ $ contact --list</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          asChild
          className="justify-start rounded-none sm:flex-1"
        >
          <a href={`mailto:${profile.email}`}>
            <span className="text-muted-foreground">mail:</span>
            {profile.email}
          </a>
        </Button>
        <Button
          variant="outline"
          asChild
          className="justify-start rounded-none sm:flex-1"
        >
          <a href={profile.linkedin} target="_blank" rel="noreferrer">
            <span className="text-muted-foreground">linkedin:</span>
            /in/duc-le-minh
          </a>
        </Button>
      </div>
    </section>
  )
}
