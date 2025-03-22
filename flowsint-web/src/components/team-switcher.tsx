"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import Logo from "./logo"
import Link from "next/link"

export function TeamSwitcher() {

  return (
    <Link className="w-full overflow-hidden flex items-center gap-2" href="/dashboard">
      <Logo /> <span className="text-md font-bold">FLOWSINT</span>
    </Link>
  )
}
