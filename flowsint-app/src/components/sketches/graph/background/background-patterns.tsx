import { memo } from 'react'
import { BackgroundVariant } from './background-types'

interface DotPatternProps {
  radius: number
  className?: string
  centerX?: number
  centerY?: number
}

export const DotPattern = memo(
  ({ radius, className, centerX = 0, centerY = 0 }: DotPatternProps) => {
    return <circle cx={centerX} cy={centerY} r={radius} className={className} fill="currentColor" />
  }
)

DotPattern.displayName = 'DotPattern'

interface LinePatternProps {
  dimensions: [number, number]
  lineWidth: number
  variant: BackgroundVariant
  className?: string
}

export const LinePattern = memo(
  ({ dimensions, lineWidth, variant, className }: LinePatternProps) => {
    const [width, height] = dimensions

    if (variant === BackgroundVariant.Lines) {
      return (
        <path
          className={className}
          stroke="currentColor"
          strokeWidth={lineWidth}
          d={`M${width / 2} 0 V${height} M0 ${height / 2} H${width}`}
        />
      )
    }

    // Cross variant
    return (
      <>
        <path
          className={className}
          stroke="currentColor"
          strokeWidth={lineWidth}
          d={`M${width / 2} 0 V${height}`}
        />
        <path
          className={className}
          stroke="currentColor"
          strokeWidth={lineWidth}
          d={`M0 ${height / 2} H${width}`}
        />
      </>
    )
  }
)

LinePattern.displayName = 'LinePattern'
