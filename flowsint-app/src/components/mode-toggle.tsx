import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/theme-provider'
import { useTranslation } from 'react-i18next'

export function ModeToggle() {
  const { setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <Button variant="ghost" className="h-6" size="icon">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 opacity-60" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 opacity-60" />
            <span className="sr-only">{t('footer.toggleTheme')}</span>
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>{t('footer.themeLight')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>{t('footer.themeDark')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>{t('footer.themeSystem')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
