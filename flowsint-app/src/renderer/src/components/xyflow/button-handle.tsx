import { HandleProps, Position, useNodeConnections } from '@xyflow/react'
import { BaseHandle } from './base-handle'

const wrapperClassNames: Record<Position, string> = {
  [Position.Top]: 'flex-col-reverse left-1/2 -translate-y-full -translate-x-1/2',
  [Position.Bottom]: 'flex-col left-1/2 translate-y-[10px] -translate-x-1/2',
  [Position.Left]: 'flex-row-reverse top-1/2 -translate-x-full -translate-y-1/2',
  [Position.Right]: 'top-1/2 -translate-y-1/2 translate-x-[10px]'
}

export const ButtonHandle = ({
  showButton = true,
  position = Position.Bottom,
  label = '',
  children,
  connectionCount = 5,
  color,
  ...props
}: HandleProps & {
  showButton?: boolean
  label?: string
  connectionCount?: number
  color?: string
}) => {
  const wrapperClassName = wrapperClassNames[position || Position.Bottom]
  const vertical = position === Position.Top || position === Position.Bottom
  const connections = useNodeConnections({
    handleType: props.type
  })
  const hasConnections = connections.length > 0
  const hasReachedConnectionLimit = connections.length >= connectionCount

  return (
    <BaseHandle
      isConnectable={!hasReachedConnectionLimit && props.isConnectable}
      position={position}
      id={props.id}
      style={{
        backgroundColor: hasReachedConnectionLimit ? '#d1d5db' : '#10b981'
      }}
      {...props}
    >
      {showButton && (
        <div
          className={`absolute group flex items-center ${wrapperClassName} ${!hasConnections ? 'pointer-events-none' : ''}`}
        >
          {/* Larger hitbox for hover detection when there are connections */}
          {hasConnections && <div className="absolute inset-0 -m-4 pointer-events-auto" />}

          {!hasConnections ? (
            <>
              <div className={`bg-gray-300 ${vertical ? 'h-16 w-[1px]' : 'h-[1px] w-16'}`} />

              <div className="nodrag nopan pointer-events-auto">{children}</div>
            </>
          ) : (
            !hasReachedConnectionLimit && (
              <div className="nodrag opacity-0 scale-25 group-hover:opacity-100 group-hover:scale-75 transition-all duration-200 ease-out z-10 nopan pointer-events-auto">
                {children}
              </div>
            )
          )}
          {label && (
            <span className="absolute max-w-15 bg-background z-1 truncate text-ellipsis top-1/2 -translate-y-1/2 left-1 text-xs text-muted-foreground">
              {label}
            </span>
          )}
        </div>
      )}
    </BaseHandle>
  )
}
