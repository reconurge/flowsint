import { Button } from '@/components/ui/button'
import { Terminal, Unlock } from 'lucide-react'
import { ModeToggle } from '../mode-toggle'
import { useLayoutStore } from '@/stores/layout-store'
import Legend from '../sketches/graph/components/legend'
import { Link, useParams } from '@tanstack/react-router'
import InfoDialog from './info'
import { memo } from 'react'
import { isMac } from '@/lib/utils'

export const StatusBar = memo(() => {
  const { id: sketch_id } = useParams({ strict: false })
  const isOpenConsole = useLayoutStore((s) => s.isOpenConsole)
  const toggleConsole = useLayoutStore((s) => s.toggleConsole)

  return (
    <div className="flex items-center bg-card h-8 px-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        {sketch_id && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-xs hover:bg-accent"
            onClick={toggleConsole}
          >
            <Terminal strokeWidth={1.4} className="h-3 w-3" />
            <span>
              Console {isOpenConsole ? '(Open)' : ''}{' '}
              <span className="text-[.7rem] opacity-60">({isMac ? '⌘' : 'ctrl'}D)</span>
            </span>
          </Button>
        )}
      </div>
      <div className="flex-1"></div>
      <div className="flex items-center gap-2">
        <Link to="/dashboard/vault">
          <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
            <Unlock strokeWidth={1.4} className="h-3 w-3 opacity-60" />
            <span>Vault</span>
          </Button>
        </Link>
        {/* <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <Trash strokeWidth={1.4} className="h-3 w-3 opacity-60" />
                    <span>Trash</span>
                </Button> */}
        {/* <Legend /> */}
        <InfoDialog />
        <ModeToggle />
      </div>
    </div>
  )
})
