import { memo, type ReactNode, useMemo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from '@xyflow/react'

interface EdgeCalculations {
  edgePath: string
  labelX: number
  labelY: number
  adjustedAngle: number
  maxWidth: number
  transform: string
}

const calculateEdgeProperties = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): EdgeCalculations => {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY
  })

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const angleRad = Math.atan2(dy, dx)
  const angleDeg = (angleRad * 180) / Math.PI
  const adjustedAngle = angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg

  const edgeLength = Math.sqrt(dx * dx + dy * dy)
  const maxWidth = Math.max(edgeLength - 20, 30)

  const transform = `translate(-50%, -50%) translate(${labelX}px, ${labelY}px) rotate(${adjustedAngle}deg)`

  return {
    edgePath,
    labelX,
    labelY,
    adjustedAngle,
    maxWidth,
    transform
  }
}

export const CustomEdge = memo(
  ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    children
  }: EdgeProps & { children: ReactNode }) => {
    // Memoize all calculations
    const edgeProps = useMemo(
      () => calculateEdgeProperties(sourceX, sourceY, targetX, targetY),
      [sourceX, sourceY, targetX, targetY]
    )

    // Memoize label style object
    const labelStyle = useMemo(
      () => ({
        transform: edgeProps.transform,
        transformOrigin: 'center' as const,
        maxWidth: `${edgeProps.maxWidth}px`,
        overflow: 'hidden' as const,
        textOverflow: 'ellipsis' as const,
        whiteSpace: 'nowrap' as const
      }),
      [edgeProps.transform, edgeProps.maxWidth]
    )

    return (
      <>
        <BaseEdge path={edgeProps.edgePath} markerEnd={markerEnd} style={style} />
        <EdgeLabelRenderer>
          <div className="nodrag nopan pointer-events-auto absolute" style={labelStyle}>
            {children}
          </div>
        </EdgeLabelRenderer>
      </>
    )
  }
)

// Add display name for debugging
CustomEdge.displayName = 'CustomEdge'
