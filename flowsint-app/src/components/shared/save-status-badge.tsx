import { memo } from 'react'
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { useTranslation } from 'react-i18next'

export type SaveStatusType = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'unsaved'

interface SaveStatusBadgeProps {
  status: SaveStatusType
  className?: string
}

export const SaveStatusBadge = memo(({ status, className }: SaveStatusBadgeProps) => {
  const { t } = useTranslation()
  const getStatusConfig = () => {
    // Normalize 'unsaved' to 'pending' for display
    const normalizedStatus = status === 'unsaved' ? 'pending' : status

    switch (normalizedStatus) {
      case 'idle':
        return {
          icon: Cloud,
          text: t('common.saveStatus.allSaved', { defaultValue: 'All changes saved' }),
          className: 'text-muted-foreground/60 bg-muted/30 border-muted'
        }
      case 'pending':
        return {
          icon: Cloud,
          text: t('common.saveStatus.pending', { defaultValue: 'Pending...' }),
          className: 'text-muted-foreground bg-muted/50 border-muted'
        }
      case 'saving':
        return {
          icon: Loader2,
          text: t('common.saveStatus.saving', { defaultValue: 'Saving...' }),
          className:
            'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
          iconClassName: 'animate-spin'
        }
      case 'saved':
        return {
          icon: Check,
          text: t('common.saveStatus.saved', { defaultValue: 'Saved' }),
          className:
            'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800'
        }
      case 'error':
        return {
          icon: AlertCircle,
          text: t('common.saveStatus.error', { defaultValue: 'Error saving' }),
          className:
            'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800'
        }
      default:
        return {
          icon: CloudOff,
          text: t('common.saveStatus.unknown', { defaultValue: 'Unknown' }),
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
            'flex items-center h-7 gap-1.5 px-1.5 py-1.5',
            'rounded-md',
            'text-xs font-medium',
            'transition-all duration-200',
            config.className,
            className
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', config.iconClassName)} />
        </div>
      </TooltipTrigger>
      <TooltipContent>{config.text}</TooltipContent>
    </Tooltip>
  )
})

SaveStatusBadge.displayName = 'SaveStatusBadge'
