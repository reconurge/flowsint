"use client"

import {
  BadgeCheck,
  Bell,
  CreditCard,
  CrownIcon,
  LogOut,
  Sparkles,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { logout } from "@/lib/actions/auth"
import { ThemeSwitch } from "./theme-switch"
import EnvIndicator from "./env-indicator"
import { cn, getAvatarColor } from "@/lib/utils"
import { getInitials } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function NavUser() {

  const session = useSession()
  console.log("session", session)

  if (session.status === "loading") {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
  }
  // const renderAvatar = () => {
  //   const name = `${session?.user?.first_name || "fd"} ${session?.user?.last_name || "fd"}`
  //   const avatarColor = getAvatarColor(name)
  //   const avatar = (
  //     <div className="relative">
  //       {isLoading ? "" :
  //         <Avatar
  //           key={profile.id}
  //           className={cn(
  //             'h-8 w-8',
  //             "border-2 border-background bg-background relative",
  //             "transition-transform",
  //             "ring-0 ring-offset-0",
  //           )}
  //         >
  //           <AvatarImage src={profile.avatar_url} alt={``} />
  //           <AvatarFallback className={cn("text-xs text-white", avatarColor)}>{getInitials(name)}</AvatarFallback>
  //         </Avatar>}
  //     </div>
  //   )
  //   return avatar
  // }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="p-0 h-auto rounded-full cursor-pointer p-1"
            >
              <div className="h-8 w-8 rounded-full bg-muted" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  {/* @ts-ignore */}
                  <span className="truncate font-semibold">{session?.user?.email}</span>
                  {/* @ts-ignore */}
                  <span className="truncate text-xs">{session?.user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-light opacity-60">Preferences</DropdownMenuLabel>
              <div className="flex text-sm items-center justify-between px-3">
                Theme
                <ThemeSwitch />
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="flex text-sm items-center justify-between px-3 py-2">
              Environment
              <EnvIndicator />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
