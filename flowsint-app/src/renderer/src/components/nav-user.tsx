"use client"

import {
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"
import { ModeToggle } from "./mode-toggle"
import { authService } from "@/api/auth-service"
import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"


export function NavUser() {
  const navigate = useNavigate()
  const logout = useCallback(() => {
    authService.logout()
    navigate({ to: "/login" })
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="h-auto flex items-center justify-center">
          <Button
            size="lg"
            className="p-0 h-auto rounded-full cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-muted" />
          </Button>
        </div>
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
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel className="text-xs font-light opacity-60">Preferences</DropdownMenuLabel>
        <div className="flex text-sm items-center justify-between px-3">
          Theme
          <ModeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
