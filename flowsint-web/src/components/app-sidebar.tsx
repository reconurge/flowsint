"use client"

import type * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { FolderSearch, Globe, KeyIcon, MapPin, Network, SettingsIcon, UserIcon, Users } from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TeamSwitcher } from "./team-switcher"
// Define navigation item type
interface NavItem {
  title: string
  href: string
  icon: React.ElementType
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: any
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  // Main navigation items
  const mainNavItems: NavItem[] = [
    {
      title: "Investigations",
      href: "/dashboard",
      icon: FolderSearch,
    },
    {
      title: "Networks",
      href: "/dashboard/networks",
      icon: Network,
    },
    {
      title: "Entities",
      href: "/dashboard/entities",
      icon: Users,
    },
    {
      title: "OSINT sources",
      href: "/dashboard/sources",
      icon: Globe,
    },
    {
      title: "Map",
      href: "/dashboard/map",
      icon: MapPin,
    },
  ]

  // Team navigation items
  const teamNavItems: NavItem[] = [
    {
      title: "My account",
      href: "/profile",
      icon: UserIcon,
    },
    {
      title: "Team members",
      href: "/team",
      icon: Users,
    },
  ]

  // Preferences navigation items
  const preferencesNavItems: NavItem[] = [
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: SettingsIcon,
    },
    {
      title: "API keys",
      href: "/dashboard/keys",
      icon: KeyIcon,
    },
  ]

  // Function to check if a link is active
  const isActive = (href: string) => {
    // Exact match for dashboard
    if (href === "/dashboard" && pathname === "/dashboard") {
      return true
    }
    // For other routes, check if pathname starts with href (for nested routes)
    return href !== "/dashboard" && pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="icon" {...props} >
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent className="p-0">
        <SidebarGroup className="group-data-[collapsible=icon]:p-auto">
          <SidebarGroupLabel>NAVIGATION</SidebarGroupLabel>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(item.href)}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup className="group-data-[collapsible=icon]:p-auto">
          <SidebarGroupLabel>TEAMS</SidebarGroupLabel>
          <SidebarMenu>
            {teamNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(item.href)}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:p-auto">
          <SidebarGroupLabel>Preferences</SidebarGroupLabel>
          <SidebarMenu>
            {preferencesNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(item.href)}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}