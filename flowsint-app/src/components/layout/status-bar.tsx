import { Button } from '@/components/ui/button'
import { Terminal, Unlock, Zap, ZapOff } from 'lucide-react'
import { ModeToggle } from '../mode-toggle'
import { useLayoutStore } from '@/stores/layout-store'
import { Link, useParams } from '@tanstack/react-router'
import InfoDialog from './info'
import { memo } from 'react'
import { isMac } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { scanService } from '@/api/scan-service'
import { cn } from '@/utils/cn'
import { CONFIG } from '@/config'
export const StatusBar = memo(() => {
  const { id: sketch_id } = useParams({ strict: false })
  const isOpenConsole = useLayoutStore((s) => s.isOpenConsole)
  const toggleConsole = useLayoutStore((s) => s.toggleConsole)

  const { data: scans, isLoading } = useQuery({
    queryKey: ['scans', 'list'],
    queryFn: () => scanService.getSketchScans(sketch_id as string),
    enabled: !!sketch_id,
    refetchInterval: 2500
    // refetchInterval: (data) => {
    //   // @ts-ignore
    //   const hasPending = Array.isArray(data) && data?.some((scan) => scan.status === 'PENDING')
    //   return hasPending ? 2000 : false
    // }
  })

  const pending =
    (Array.isArray(scans) && scans?.some((scan) => scan.status === 'PENDING')) || false

  return (
    <div className="flex items-center bg-card h-8 px-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        {sketch_id && (
          <>
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
            {CONFIG.SCANS_LIST_FEATURE_FLAG && (
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-5 gap-1 text-xs hover:bg-accent')}
                onClick={toggleConsole}
              >
                {pending ? (
                  <Zap strokeWidth={1.4} className="h-3 w-3 text-primary" />
                ) : (
                  <ZapOff strokeWidth={1.4} className="h-3 w-3" />
                )}
                <span>
                  Scans{' '}
                  <span className="text-xs opacity-80">
                    {isLoading ? '(-)' : `(${scans?.length ?? 0})`}
                  </span>
                </span>
                {pending && <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />}
              </Button>
            )}
          </>
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
