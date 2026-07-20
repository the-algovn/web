"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@algovn/ui/breadcrumb"
import { CommandMenu } from "@algovn/ui/command-menu"
import { Separator } from "@algovn/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@algovn/ui/sidebar"
import { Toaster } from "@algovn/ui/sonner"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

export interface AppShellNavItem {
  title: string
  href: string
  icon?: LucideIcon
}

export interface AppShellNavGroup {
  label?: string
  items: AppShellNavItem[]
}

export interface AppShellProps {
  brand: React.ReactNode
  navigation: AppShellNavGroup[]
  headerRight?: React.ReactNode
  children: React.ReactNode
}

function toTitle(segment: string) {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AppShell({
  brand,
  navigation,
  headerRight,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-3">{brand}</SidebarHeader>
        <SidebarContent>
          {navigation.map((group, i) => (
            <SidebarGroup key={group.label ?? i}>
              {group.label ? (
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                      >
                        <Link href={item.href}>
                          {item.icon ? <item.icon /> : null}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                {pathname === "/" ? (
                  <BreadcrumbPage>Home</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href="/">Home</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {segments.map((segment, i) => (
                <React.Fragment key={segments.slice(0, i + 1).join("/")}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {i === segments.length - 1 ? (
                      <BreadcrumbPage>{toTitle(segment)}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={`/${segments.slice(0, i + 1).join("/")}`}>
                          {toTitle(segment)}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <CommandMenu navigation={navigation} />
            {headerRight}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
