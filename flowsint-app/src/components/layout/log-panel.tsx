import { Badge } from '../ui/badge'
import { logService } from '@/api/log-service'
import { useConfirm } from '../use-confirm-dialog'
import { useParams } from '@tanstack/react-router'
import {
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Zap,
  Clock,
  RotateCcw,
  PartyPopper,
  BarChart3,
  FileText,
  Trash2
} from 'lucide-react'
import { useEffect, useRef, memo } from 'react'
import { CopyButton } from '../copy'
import { EventLevel } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { useEvents } from '@/hooks/use-events'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const logLevelConfig = {
  [EventLevel.INFO]: {
    icon: Info,
    color: 'dark:text-blue-400 text-blue-600',
    bg: 'bg-blue-500/10',
    badge: 'dark:bg-blue-500/20 dark:text-blue-300 bg-blue-500/20 text-blue-600',
    emoji: 'ℹ️'
  },
  [EventLevel.WARNING]: {
    icon: AlertTriangle,
    color: 'dark:text-yellow-400 text-yellow-600',
    bg: 'bg-yellow-500/10',
    badge: 'dark:bg-yellow-500/20 dark:text-yellow-300 bg-yellow-500/20 text-yellow-600',
    emoji: '⚠️'
  },
  [EventLevel.FAILED]: {
    icon: AlertCircle,
    color: 'dark:text-red-400 text-red-600',
    bg: 'bg-red-500/10',
    badge: 'dark:bg-red-500/20 dark:text-red-300 bg-red-500/20 text-red-600',
    emoji: '❌'
  },
  [EventLevel.SUCCESS]: {
    icon: CheckCircle,
    color: 'dark:text-green-400 text-green-600',
    bg: 'bg-green-500/10',
    badge: 'dark:bg-green-500/20 dark:text-green-300 bg-green-500/20 text-green-600',
    emoji: '✅'
  },
  [EventLevel.DEBUG]: {
    icon: Zap,
    color: 'dark:text-purple-400 text-purple-600',
    bg: 'bg-purple-500/10',
    badge: 'dark:bg-purple-500/20 dark:text-purple-300 bg-purple-500/20 text-purple-600',
    emoji: '🐛'
  },
  [EventLevel.PENDING]: {
    icon: Clock,
    color: 'dark:text-orange-400 text-orange-600',
    bg: 'bg-orange-500/10',
    badge: 'dark:bg-orange-500/20 dark:text-orange-300 bg-orange-500/20 text-orange-600',
    emoji: '⏳'
  },
  [EventLevel.RUNNING]: {
    icon: RotateCcw,
    color: 'dark:text-blue-400 text-blue-600',
    bg: 'bg-blue-500/10',
    badge: 'dark:bg-blue-500/20 dark:text-blue-300 bg-blue-500/20 text-blue-600',
    emoji: '🔄'
  },
  [EventLevel.COMPLETED]: {
    icon: PartyPopper,
    color: 'dark:text-green-400 text-green-600',
    bg: 'bg-green-500/10',
    badge: 'dark:bg-green-500/20 dark:text-green-300 bg-green-500/20 text-green-600',
    emoji: '🎉'
  },
  [EventLevel.GRAPH_APPEND]: {
    icon: BarChart3,
    color: 'dark:text-purple-400 text-purple-600',
    bg: 'bg-purple-500/10',
    badge: 'dark:bg-purple-500/20 dark:text-purple-300 bg-purple-500/20 text-purple-600',
    emoji: '📊'
  }
}
// Fallback config for any missing event levels
const defaultConfig = {
  icon: FileText,
  color: 'text-gray-400',
  bg: 'bg-gray-500/10',
  badge: 'bg-gray-500/20 text-gray-300',
  emoji: '📝'
}

export const LogPanel = memo(() => {
  const { id: sketch_id } = useParams({ strict: false })
  const { confirm } = useConfirm()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { logs, refetch } = useEvents(sketch_id as string)
  const queryClient = useQueryClient()

  // Delete logs mutation
  const deleteLogsMutation = useMutation({
    mutationFn: logService.delete,
    onSuccess: () => {
      // Invalidate logs for this sketch
      if (sketch_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.logs.bySketch(sketch_id)
        })
      }
      refetch()
    },
    onError: (error) => {
      console.error('Error deleting logs:', error)
    }
  })

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const handleDeleteLogs = async () => {
    if (!sketch_id) return
    if (
      !(await confirm({
        title: 'Delete all logs',
        message: 'Are you sure you want to delete all logs?'
      }))
    )
      return
    await deleteLogsMutation.mutateAsync(sketch_id)
  }

  return (
    <div className="h-full bg-card overflow-hidden border-t flex flex-col relative">
      <div
        className={cn('flex-1 h-full', logs.length === 0 ? 'overflow-hidden' : 'overflow-y-auto')}
        ref={scrollAreaRef}
      >
        <div className="text-sm h-full">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground h-full py-8 flex !overflow-hidden flex-col items-center justify-center">
              <p className="text-lg font-medium mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary animate-pulse" /> Waiting for investigation
                activity
              </p>
              <p className="text-sm opacity-70">Events will appear here as they happen</p>
            </div>
          ) : (
            logs.map((log, i) => {
              //@ts-ignore
              const config = logLevelConfig[log.type] || defaultConfig
              const Icon = config.icon

              return (
                <div
                  key={i}
                  className={cn(
                    'group flex items-start gap-3 p-2 py-1 transition-colors hover:bg-card/50'
                    // config.bg,
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
                    <span className="text-xs font-medium min-w-[60px]">
                      {formatTime(log.created_at)}
                    </span>
                    <Badge className={cn('text-[.6rem] px-2 py-0.5', config.badge)}>
                      {log.type}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{log.payload.message}</p>
                  </div>
                  <CopyButton
                    content={`[${formatTime(log.created_at)}] ${log.type}: ${log.payload.message}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                  />
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="absolute top-1 right-1">
        <Button variant="ghost" size="icon" onClick={refetch}>
          <RotateCcw strokeWidth={1.5} className="w-4 h-4 opacity-60" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDeleteLogs}>
          <Trash2 strokeWidth={1.5} className="w-4 h-4 opacity-60" />
        </Button>
      </div>
    </div>
  )
})
