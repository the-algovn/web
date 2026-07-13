"use client"

import { useRouter } from "next/navigation"
import * as React from "react"
import { Search } from "lucide-react"
import type { AppShellNavGroup } from "@algovn/ui/app-shell"
import { Button } from "@algovn/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@algovn/ui/command"

export function CommandMenu({ navigation }: { navigation: AppShellNavGroup[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground w-full max-w-48 justify-between font-normal sm:w-48"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5" /> Search…
        </span>
        <kbd className="bg-muted pointer-events-none rounded px-1.5 font-mono text-[10px]">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Go to page…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {navigation.map((group, i) => (
            <CommandGroup key={group.label ?? i} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.title}
                  onSelect={() => {
                    setOpen(false)
                    router.push(item.href)
                  }}
                >
                  {item.icon ? <item.icon className="size-4" /> : null}
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
