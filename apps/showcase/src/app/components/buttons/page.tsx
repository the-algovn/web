import { Bold, Italic, Loader2, Mail, Trash2, Underline } from "lucide-react"
import { Button } from "@algovn/ui/button"
import { PageHeader } from "@algovn/ui/page-header"
import { Toggle } from "@algovn/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@algovn/ui/toggle-group"
import { Demo } from "@/components/demo"

export default function ButtonsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Buttons" description="Button, Toggle and ToggleGroup." />
      <Demo title="Variants">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </Demo>
      <Demo title="Sizes">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Send email">
          <Mail />
        </Button>
      </Demo>
      <Demo title="States">
        <Button disabled>Disabled</Button>
        <Button disabled>
          <Loader2 className="animate-spin" />
          Loading
        </Button>
        <Button variant="destructive">
          <Trash2 /> With icon
        </Button>
      </Demo>
      <Demo title="Toggle">
        <Toggle aria-label="Toggle bold">
          <Bold />
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle italic">
          <Italic />
        </Toggle>
        <Toggle disabled aria-label="Toggle underline">
          <Underline />
        </Toggle>
      </Demo>
      <Demo title="ToggleGroup">
        <ToggleGroup type="multiple" variant="outline">
          <ToggleGroupItem value="bold" aria-label="Bold">
            <Bold />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <Italic />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <Underline />
          </ToggleGroupItem>
        </ToggleGroup>
      </Demo>
    </div>
  )
}
