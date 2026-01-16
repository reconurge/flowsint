import { Badge } from '@/components/ui/badge'
import { cn, hexToRgba } from '@/lib/utils'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { memo } from 'react'

type TypeBadgeProps = {
  type: string
  className?: string
  children?: React.ReactNode
}

function TypeBadgeComponent({ type, children, className }: TypeBadgeProps) {
  const colors = useNodesDisplaySettings((s) => s.colors)
  const color =
    colors[type as keyof typeof colors] ||
    'bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/60'
  return (
    <Badge
      variant="outline"
      style={{ backgroundColor: hexToRgba(color, 0.5) }}
      className={cn('font-medium rounded border-transparent', className)}
    >
      {children ?? type}
    </Badge>
  )
}

export const TypeBadge = memo(TypeBadgeComponent)
