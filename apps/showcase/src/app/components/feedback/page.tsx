"use client"

import * as React from "react"
import { CircleAlert, CircleCheck } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@algovn/ui/alert"
import { Button } from "@algovn/ui/button"
import { PageHeader } from "@algovn/ui/page-header"
import { Progress } from "@algovn/ui/progress"
import { Skeleton } from "@algovn/ui/skeleton"
import { Spinner } from "@algovn/ui/spinner"
import { Demo } from "@/components/demo"

function fakePromise() {
  return new Promise((resolve) => setTimeout(resolve, 1500))
}

function AnimatedProgressDemo() {
  const [value, setValue] = React.useState(13)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setValue((prev) => (prev >= 100 ? 0 : prev + 10))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return <Progress value={value} className="w-56" />
}

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Feedback" description="Alerts, toasts, progress and loading states." />
      <Demo title="Alert" className="flex-col items-stretch">
        <Alert>
          <CircleCheck />
          <AlertTitle>Success! Your changes have been saved</AlertTitle>
          <AlertDescription>This is an alert with icon, title and description.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Unable to process your payment</AlertTitle>
          <AlertDescription>Please verify your billing information and try again.</AlertDescription>
        </Alert>
      </Demo>
      <Demo title="Toast (sonner)">
        <Button
          variant="outline"
          onClick={() =>
            toast("Event has been created", {
              description: "Sunday, December 03, 2023 at 9:00 AM",
            })
          }
        >
          Show toast
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success("Changes saved successfully.")}
        >
          Show success
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error("Something went wrong.")}
        >
          Show error
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.promise(fakePromise, {
              loading: "Loading...",
              success: "Data has loaded",
              error: "Error loading data",
            })
          }
        >
          Show promise
        </Button>
      </Demo>
      <Demo title="Progress">
        <Progress value={33} className="w-56" />
        <AnimatedProgressDemo />
      </Demo>
      <Demo title="Skeleton" className="flex-col items-stretch">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Demo>
      <Demo title="Spinner">
        <Spinner className="size-6" />
        <span className="text-muted-foreground text-sm">Loading...</span>
      </Demo>
    </div>
  )
}
