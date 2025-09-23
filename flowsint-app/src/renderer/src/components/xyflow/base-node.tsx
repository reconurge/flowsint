import { cn } from '@/lib/utils'
import { forwardRef, HTMLAttributes } from 'react'

export const BaseNode = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative rounded-md border bg-card text-card-foreground',
        'hover:ring-1',
        // React Flow displays node elements inside of a `NodeWrapper` component,
        // which compiles down to a div with the class `react-flow__node`.
        // When a node is selected, the class `selected` is added to the
        // `react-flow__node` element. This allows us to style the node when it
        // is selected, using Tailwind's `&` selector.
        '[.react-flow\\_\\_node.selected_&]:border-muted-foreground',
        '[.react-flow\\_\\_node.selected_&]:shadow-lg',
        className
      )}
      tabIndex={0}
      {...props}
    />
  )
)
BaseNode.displayName = 'BaseNode'

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export const BaseNodeHeader = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <header
      ref={ref}
      {...props}
      className={cn(
        'mx-0 my-0 -mb-1 flex flex-row items-center justify-between gap-2 px-3 py-2',
        // Remove or modify these classes if you modify the padding in the
        // `<BaseNode />` component.
        className
      )}
    />
  )
)
BaseNodeHeader.displayName = 'BaseNodeHeader'

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export const BaseNodeHeaderTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="base-node-title"
    className={cn('user-select-none flex-1 font-semibold', className)}
    {...props}
  />
))
BaseNodeHeaderTitle.displayName = 'BaseNodeHeaderTitle'

export const BaseNodeContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="base-node-content"
      className={cn('flex flex-col gap-y-2 p-3', className)}
      {...props}
    />
  )
)
BaseNodeContent.displayName = 'BaseNodeContent'

export const BaseNodeFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="base-node-footer"
      className={cn('flex flex-col items-center gap-y-2 border-t px-3 pb-3 pt-2', className)}
      {...props}
    />
  )
)
BaseNodeFooter.displayName = 'BaseNodeFooter'
