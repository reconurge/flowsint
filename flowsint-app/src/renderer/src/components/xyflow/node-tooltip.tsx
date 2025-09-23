import { cn } from '@/lib/utils'
import { NodeToolbar, NodeToolbarProps } from '@xyflow/react'
import React, {
  createContext,
  forwardRef,
  HTMLAttributes,
  useCallback,
  useContext,
  useState
} from 'react'

/* TOOLTIP CONTEXT ---------------------------------------------------------- */

type TooltipContextType = {
  isVisible: boolean
  showTooltip: () => void
  hideTooltip: () => void
}

const TooltipContext = createContext<TooltipContextType | null>(null)

/* TOOLTIP NODE ------------------------------------------------------------- */

export const NodeTooltip = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children }, ref) => {
    const [isVisible, setIsVisible] = useState(false)

    const showTooltip = useCallback(() => setIsVisible(true), [])
    const hideTooltip = useCallback(() => setIsVisible(false), [])

    return (
      <TooltipContext.Provider value={{ isVisible, showTooltip, hideTooltip }}>
        <div ref={ref}>{children}</div>
      </TooltipContext.Provider>
    )
  }
)
NodeTooltip.displayName = 'NodeTooltip'

/* TOOLTIP TRIGGER ---------------------------------------------------------- */

export const NodeTooltipTrigger = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const tooltipContext = useContext(TooltipContext)
    if (!tooltipContext) {
      throw new Error('NodeTooltipTrigger must be used within NodeTooltip')
    }
    const { showTooltip, hideTooltip } = tooltipContext

    const onMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        props.onMouseEnter?.(e)
        showTooltip()
      },
      [props, showTooltip]
    )

    const onMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        props.onMouseLeave?.(e)
        hideTooltip()
      },
      [props, hideTooltip]
    )

    return <div ref={ref} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...props} />
  }
)
NodeTooltipTrigger.displayName = 'NodeTooltipTrigger'

/* TOOLTIP CONTENT ---------------------------------------------------------- */

// /**
//  * A component that displays the tooltip content based on visibility context.
//  */

export const NodeTooltipContent = forwardRef<HTMLDivElement, NodeToolbarProps>(
  ({ children, position, className, ...props }, ref) => {
    const tooltipContext = useContext(TooltipContext)
    if (!tooltipContext) {
      throw new Error('NodeTooltipContent must be used within NodeTooltip')
    }
    const { isVisible } = tooltipContext

    return (
      <div ref={ref}>
        <NodeToolbar
          isVisible={isVisible}
          className={cn('rounded-sm bg-primary p-2 text-primary-foreground', className)}
          tabIndex={1}
          position={position}
          {...props}
        >
          {children}
        </NodeToolbar>
      </div>
    )
  }
)
