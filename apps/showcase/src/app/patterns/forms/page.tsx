import { PageHeader } from "@algovn/ui/page-header"
import { LoginForm } from "@/components/login-form"
import { SettingsForm } from "@/components/settings-form"

export default function FormsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title="Forms"
        description="react-hook-form + zod recipes with submission states."
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <LoginForm />
        <SettingsForm />
      </div>
    </div>
  )
}
