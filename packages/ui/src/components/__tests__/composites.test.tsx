import { render, screen } from "@testing-library/react"
import { expect, it } from "vitest"
import { EmptyState } from "@algovn/ui/empty-state"
import { PageHeader } from "@algovn/ui/page-header"
import { StatCard } from "@algovn/ui/stat-card"

it("PageHeader renders title, description and actions", () => {
  render(<PageHeader title="Orders" description="All open orders" actions={<button>New</button>} />)
  expect(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument()
  expect(screen.getByText("All open orders")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument()
})

it("EmptyState renders title, description and action", () => {
  render(<EmptyState title="No results" description="Try adjusting filters" action={<button>Clear</button>} />)
  expect(screen.getByText("No results")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument()
})

it("StatCard renders value and delta with direction", () => {
  render(<StatCard title="Revenue" value="$12,430" delta={{ value: "+8.1%", direction: "up" }} />)
  expect(screen.getByText("Revenue")).toBeInTheDocument()
  expect(screen.getByText("$12,430")).toBeInTheDocument()
  expect(screen.getByText("+8.1%")).toBeInTheDocument()
})
