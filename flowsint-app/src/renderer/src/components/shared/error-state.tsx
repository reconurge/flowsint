import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'

type ErrorStateProps = {
  title?: string
  description?: string
  error?: unknown
  onRetry?: () => void
  className?: string
}

const getErrorMessage = (error: unknown) => {
  if (!error) return null
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again.',
  error,
  onRetry,
  className
}: ErrorStateProps) {
  const message = getErrorMessage(error)
  return (
    <div className={cn('w-full h-full bg-card flex items-center justify-center', className)}>
      <div className="p-6 flex flex-col items-center text-center gap-3 text-muted-foreground max-w-sm">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs opacity-70">{description}</p>}
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        )}
        {message && <p className="text-[11px] leading-relaxed opacity-60 break-words">{message}</p>}
      </div>
    </div>
  )
}

export default ErrorState
