import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const nodeStatusIndicatorVariants = cva(
  'absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-background',
  {
    variants: {
      variant: {
        success: 'bg-green-500',
        error: 'bg-red-500',
        loading: 'bg-blue-500',
        pending: 'bg-gray-500'
      }
    },
    defaultVariants: {
      variant: 'pending'
    }
  }
)

interface NodeStatusIndicatorProps extends VariantProps<typeof nodeStatusIndicatorVariants> {
  className?: string
  children?: React.ReactNode
  showStatus: boolean
}

export function NodeStatusIndicator({
  className,
  variant,
  children,
  showStatus = true
}: NodeStatusIndicatorProps) {
  return (
    <div className="relative">
      {children}
      {showStatus && <div className={cn(nodeStatusIndicatorVariants({ variant }), className)} />}
    </div>
  )
}
