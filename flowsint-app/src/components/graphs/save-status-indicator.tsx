import { memo } from 'react'
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react'
import { SaveStatus } from '@/hooks/use-save-node-positions'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

interface SaveStatusIndicatorProps {
  status: SaveStatus
}

export const SaveStatusIndicator = memo(({ status }: SaveStatusIndicatorProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          icon: Cloud,
          text: 'All changes saved',
          className: 'text-muted-foreground/60 bg-muted/30 border-muted'
        }
      case 'pending':
        return {
          icon: Cloud,
          text: 'Pending...',
          className: 'text-muted-foreground bg-muted/50 border-muted'
        }
      case 'saving':
        return {
          icon: Loader2,
          text: 'Saving...',
          className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
          iconClassName: 'animate-spin'
        }
      case 'saved':
        return {
          icon: Check,
          text: 'Saved',
          className: 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800'
        }
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Error saving',
          className: 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800'
        }
      default:
        return {
          icon: CloudOff,
          text: 'Unknown',
          className: 'text-muted-foreground bg-muted/50 border-muted'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center h-8 gap-1.5 px-2.5 py-1.5',
            'rounded-md border',
            'text-xs font-medium',
            'transition-all duration-200',
            config.className
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', config.iconClassName)} />
          {/* <span>{config.text}</span> */}
        </div>
      </TooltipTrigger>
      <TooltipContent>{"All nodes aved"}</TooltipContent>
    </Tooltip>
  )
})

SaveStatusIndicator.displayName = 'SaveStatusIndicator'
