"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@algovn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@algovn/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@algovn/ui/form"
import { Input } from "@algovn/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@algovn/ui/select"
import { Switch } from "@algovn/ui/switch"
import { Textarea } from "@algovn/ui/textarea"

const TIMEZONES = [
  { value: "utc", label: "UTC" },
  { value: "america-new_york", label: "America/New York" },
  { value: "europe-london", label: "Europe/London" },
  { value: "asia-ho_chi_minh", label: "Asia/Ho Chi Minh" },
]

const settingsSchema = z.object({
  displayName: z.string().min(2, "At least 2 characters"),
  timezone: z.string().min(1, "Pick a timezone"),
  bio: z.string().max(160, "160 characters max"),
  alerts: z.boolean(),
})

type SettingsValues = z.infer<typeof settingsSchema>

export function SettingsForm() {
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { displayName: "", timezone: "", bio: "", alerts: true },
  })

  const bio = useWatch({ control: form.control, name: "bio" })

  async function onSubmit(values: SettingsValues) {
    const save = new Promise<void>((resolve) => setTimeout(resolve, 1000))
    toast.promise(save, {
      loading: "Saving settings...",
      success: `Saved settings for ${values.displayName}`,
      error: "Failed to save settings",
    })
    await save
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Select, textarea, and switch fields.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pick a timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell us about yourself" {...field} />
                  </FormControl>
                  <FormDescription>{160 - bio.length} characters remaining</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alerts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="!mt-0">Email alerts</FormLabel>
                    <FormDescription>Get notified about account activity.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
