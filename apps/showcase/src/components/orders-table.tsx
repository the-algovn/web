"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@algovn/ui/badge"
import { DataTable, DataTableColumnHeader } from "@algovn/ui/data-table"
import { cn } from "@algovn/ui/lib/utils"

type Order = {
  id: string
  symbol: string
  side: "buy" | "sell"
  qty: number
  price: number
  status: "filled" | "open" | "cancelled"
}

const symbols = ["VNM", "FPT", "HPG", "VIC", "MWG", "VCB"]
const statuses: Order["status"][] = ["filled", "open", "cancelled"]

const orders: Order[] = Array.from({ length: 30 }, (_, i) => ({
  id: `ORD-${String(i + 1).padStart(4, "0")}`,
  symbol: symbols[i % symbols.length]!,
  side: i % 3 === 0 ? "sell" : "buy",
  qty: (i + 1) * 100,
  price: 25 + ((i * 7) % 60) + 0.5,
  status: statuses[i % statuses.length]!,
}))

const statusVariant = {
  filled: "default",
  open: "secondary",
  cancelled: "outline",
} as const

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "id",
    header: "Order",
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("id")}</span>,
  },
  {
    accessorKey: "symbol",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Symbol" />,
  },
  {
    accessorKey: "side",
    header: "Side",
    cell: ({ row }) => (
      <span className={cn("font-medium", row.original.side === "buy" ? "text-success" : "text-destructive")}>
        {row.original.side.toUpperCase()}
      </span>
    ),
  },
  {
    accessorKey: "qty",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.qty.toLocaleString()}</span>,
  },
  {
    accessorKey: "price",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.price.toFixed(2)}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>,
  },
]

export function OrdersTable() {
  return <DataTable columns={columns} data={orders} filterColumn="symbol" filterPlaceholder="Filter symbols…" />
}
