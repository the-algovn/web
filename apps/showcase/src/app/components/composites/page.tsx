import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { PageHeader } from "@algovn/ui/page-header"
import { StatCard } from "@algovn/ui/stat-card"
import { Inbox } from "lucide-react"
import { Demo } from "@/components/demo"

export default function CompositesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title="Composites"
        description="PageHeader, EmptyState and StatCard."
      />
      <Demo title="PageHeader" className="flex-col items-stretch">
        <div className="rounded-md border p-4">
          <PageHeader
            title="Team members"
            description="Manage who has access to this workspace."
            actions={
              <>
                <Button variant="outline">Export</Button>
                <Button>Invite member</Button>
              </>
            }
            className="pb-0"
          />
        </div>
      </Demo>
      <Demo title="EmptyState" className="flex-col items-stretch">
        <EmptyState
          icon={<Inbox />}
          title="No messages"
          description="You don't have any messages yet. New messages will appear here."
          action={<Button>Compose message</Button>}
        />
      </Demo>
      <Demo title="StatCard" className="flex-col items-stretch">
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Revenue"
            value="$45,231.89"
            delta={{ value: "+20.1%", direction: "up" }}
          />
          <StatCard
            title="Subscriptions"
            value="2,350"
            delta={{ value: "-4.5%", direction: "down" }}
          />
          <StatCard
            title="Active Now"
            value="573"
            delta={{ value: "0%", direction: "flat" }}
          />
        </div>
      </Demo>
    </div>
  )
}
