import { LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from './ui/button'
import { ModeToggle } from './mode-toggle'
import { authService } from '@/api/auth-service'
import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'

export function NavUser() {
  const navigate = useNavigate()
  const logout = useCallback(() => {
    authService.logout()
    navigate({ to: '/login' })
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="h-auto flex items-center justify-center">
          <Button size="lg" className="p-0 h-auto rounded-full cursor-pointer">
            <Avatar>
              <AvatarImage src="https://cherry.img.pmdstatic.net/fit/https.3A.2F.2Fimg.2Egamesider.2Ecom.2Fs3.2Ffrgsg.2F1280.2Fthe-last-of-us.2Fdefault_2023-11-27_291826c8-5b2b-4928-a167-259dd0b18a7c.2Ejpeg/1200x675/quality/80/the-last-of-us-saison-2-mauvaise-nouvelle-pedro-pascal.jpg" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
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
            <Avatar>
              <AvatarImage src="https://cherry.img.pmdstatic.net/fit/https.3A.2F.2Fimg.2Egamesider.2Ecom.2Fs3.2Ffrgsg.2F1280.2Fthe-last-of-us.2Fdefault_2023-11-27_291826c8-5b2b-4928-a167-259dd0b18a7c.2Ejpeg/1200x675/quality/80/the-last-of-us-saison-2-mauvaise-nouvelle-pedro-pascal.jpg" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight"></div>
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
