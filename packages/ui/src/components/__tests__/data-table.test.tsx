import { DataTable, DataTableColumnHeader } from "@algovn/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it } from "vitest"

type Person = { name: string; email: string; age: number }

const people: Person[] = Array.from({ length: 15 }, (_, i) => ({
  name: `Person ${String(i + 1).padStart(2, "0")}`,
  email: `p${i + 1}@algovn.com`,
  age: 20 + i,
}))

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "age", header: "Age" },
]

function rows() {
  return within(screen.getAllByRole("table")[0]!).getAllByRole("row").slice(1) // drop header row
}

it("paginates: 10 rows per page by default, next shows the rest", async () => {
  const user = userEvent.setup()
  render(<DataTable columns={columns} data={people} />)
  expect(rows()).toHaveLength(10)
  await user.click(screen.getByRole("button", { name: /next/i }))
  expect(rows()).toHaveLength(5)
})

it("sorts by column header click", async () => {
  const user = userEvent.setup()
  render(<DataTable columns={columns} data={people} />)
  await user.click(screen.getByRole("button", { name: /name/i })) // asc
  expect(rows()[0]).toHaveTextContent("Person 01")
  await user.click(screen.getByRole("button", { name: /name/i })) // desc
  expect(rows()[0]).toHaveTextContent("Person 15")
})

it("filters via the toolbar input", async () => {
  const user = userEvent.setup()
  render(
    <DataTable
      columns={columns}
      data={people}
      filterColumn="name"
      filterPlaceholder="Filter names…"
    />,
  )
  await user.type(screen.getByPlaceholderText("Filter names…"), "Person 03")
  expect(rows()).toHaveLength(1)
  expect(rows()[0]).toHaveTextContent("p3@algovn.com")
})

it("toggles column visibility from the View menu", async () => {
  const user = userEvent.setup()
  render(<DataTable columns={columns} data={people} />)
  expect(screen.getByText("Email")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: /view/i }))
  await user.click(
    await screen.findByRole("menuitemcheckbox", { name: /email/i }),
  )
  expect(screen.queryByText("Email")).not.toBeInTheDocument()
})
