import { PageHeader } from "@algovn/ui/page-header"
import { OrdersTable } from "@/components/orders-table"

export default function DataTablePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Data Table"
        description="Sorting, filtering, pagination and column visibility."
      />
      <OrdersTable />
    </div>
  )
}
