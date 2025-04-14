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
export function NavUser({
  profile_id,
}: {
  profile_id: any
}) {
  const { isMobile } = useSidebar()

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profiles", profile_id],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${profile_id}`)
      return res.json()
    },
    refetchOnWindowFocus: true,
  })

  if (isLoading) return

  const renderAvatar = () => {
    const name = `${profile?.first_name || "fd"} ${profile?.last_name || "fd"}`
    const avatarColor = getAvatarColor(name)
    const avatar = (
      <div className="relative">
        {isLoading ? "" :
          <Avatar
            key={profile.id}
            className={cn(
              'h-8 w-8',
              "border-2 border-background bg-background relative",
              "transition-transform",
              "ring-0 ring-offset-0",
            )}
          >
            <AvatarImage src={profile.image} alt={``} />
            <AvatarFallback className={cn("text-xs text-white", avatarColor)}>{getInitials(name)}</AvatarFallback>
          </Avatar>}
      </div>
    )
    return avatar
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="p-0 h-auto rounded-full cursor-pointer p-1"
            >
              {renderAvatar()}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                {renderAvatar()}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{profile.name}</span>
                  <span className="truncate text-xs">{profile.email}</span>
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
