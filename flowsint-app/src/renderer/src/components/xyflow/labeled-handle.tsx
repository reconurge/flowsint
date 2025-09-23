import { forwardRef, ReactNode, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { type HandleProps } from '@xyflow/react'

import { BaseHandle } from '@/components/xyflow/base-handle'
import { Badge } from '@/components/ui/badge'

const flexDirections = {
  top: 'flex-col',
  right: 'flex-row-reverse justify-end',
  bottom: 'flex-col-reverse justify-end',
  left: 'flex-row'
}

export const LabeledHandle = forwardRef<
  HTMLDivElement,
  HandleProps &
    HTMLAttributes<HTMLDivElement> & {
      label: string | (string & Element) | ReactNode
      description: string
      handleClassName?: string
      labelClassName?: string
    }
>(({ className, labelClassName, handleClassName, label, position, description, ...props }, ref) => (
  <div ref={ref} className={cn('relative flex items-center', flexDirections[position], className)}>
    <BaseHandle position={position} className={handleClassName} {...props} />
    <label className={cn('px-3 text-foreground', labelClassName)}>
      {label} <Badge variant={'outline'}>{description}</Badge>
    </label>
  </div>
))

LabeledHandle.displayName = 'LabeledHandle'
