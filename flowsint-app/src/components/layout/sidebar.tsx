import { Home, Lock, type LucideIcon, PanelLeft, Workflow, Shapes } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useLayoutStore } from '@/stores/layout-store'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { memo } from 'react'
import { isMac } from '@/lib/utils'
import { NavUser } from '../nav-user'

interface NavItem {
  icon: LucideIcon
  label: string
  href?: string
}

export const Sidebar = memo(() => {
  const togglePanel = useLayoutStore((s) => s.togglePanel)

  const navItems: NavItem[] = [
    { icon: Home, label: 'Dashboard', href: '/dashboard/' },
    { icon: Workflow, label: 'Flows', href: '/dashboard/flows' },
    { icon: Shapes, label: 'Custom types', href: '/dashboard/custom-types' },
    { icon: Lock, label: 'Vault', href: '/dashboard/vault' }
  ]

  const commonClasses = 'flex items-center justify-center h-12 w-full rounded-sm hover:bg-muted'

  return (
    <div className="w-14 border-r h-full flex flex-col shrink-0 bg-card">
      <div className="flex flex-col items-center gap-1 p-2">
        {navItems.map((item, index) => {
          const IconComponent = item.icon
          const content = (
            <IconComponent key={index} strokeWidth={1.2} className="h-4 w-4 opacity-70" />
          )
          return item.href ? (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    className={commonClasses}
                    activeProps={{ className: `${commonClasses}` }}
                  >
                    {content}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={commonClasses}>{content}</button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
      <div className="grow"></div>
      <div className="flex flex-col justify-center items-center p-3 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button variant={'ghost'} onClick={togglePanel}>
                  <PanelLeft className={`h-12 w-12 transition-transform duration-200`} />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              Toggle panel
              <span className="text-[.7rem] ml-1 opacity-60">({isMac ? '⌘' : 'ctrl'}B)</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <NavUser />
      </div>
    </div>
  )
})
