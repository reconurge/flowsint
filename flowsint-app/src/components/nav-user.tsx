import { LogOut, UserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu'
import { Button } from './ui/button'
import { ModeToggle } from './mode-toggle'
import { authService } from '@/api/auth-service'
import { useCallback } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { UserAvatar } from './ui/avatar'
import { useAuthStore } from '@/stores/auth-store'
import { getDisplayName } from '@/lib/user-display'
import { availableLanguages } from '@/i18n'

function getLanguageDisplayName(lng: string) {
  try {
    const name = new Intl.DisplayNames([lng], { type: 'language' }).of(lng) || lng
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch (e) {
    return lng.toUpperCase()
  }
}

export function NavUser() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const displayName = getDisplayName(user)

  const logout = useCallback(() => {
    authService.logout()
    navigate({ to: '/login' })
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="h-auto flex items-center justify-center">
          <Button size="lg" className="p-0 h-auto rounded-full cursor-pointer">
            <UserAvatar user={user} />
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
            <UserAvatar user={user} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              {user?.email && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel className="text-xs font-light opacity-60">{t('navUser.preferences')}</DropdownMenuLabel>
        <div className="flex text-sm items-center justify-between px-3 py-1.5">
          {t('navUser.theme')}
          <ModeToggle />
        </div>
        <div className="flex text-sm items-center justify-between px-3 py-1.5">
          {t('navUser.language')}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <Button variant="ghost" className="h-6 px-2 text-xs">
                  {i18n.resolvedLanguage ? i18n.resolvedLanguage.toUpperCase() : 'EN'}
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableLanguages.map((lng) => (
                <DropdownMenuItem key={lng} onClick={() => i18n.changeLanguage(lng)}>
                  {getLanguageDisplayName(lng)} {i18n.resolvedLanguage === lng && '✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile">
            <UserIcon />
            {t('navUser.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>
          <LogOut />
          {t('navUser.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
