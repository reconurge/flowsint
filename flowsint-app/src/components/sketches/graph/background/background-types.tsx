import { CSSProperties } from 'react'

export enum BackgroundVariant {
  Dots = 'dots',
  Lines = 'lines',
  Cross = 'cross'
}

export interface BackgroundProps {
  /** Unique identifier for the background pattern */
  id?: string
  /** The visual style of the background */
  variant?: BackgroundVariant
  /** Spacing between pattern elements (can be [x, y] or single number) */
  gap?: number | [number, number]
  /** Size of dots or line thickness */
  size?: number
  /** Line width for line/cross variants */
  lineWidth?: number
  /** Offset of the pattern (can be [x, y] or single number) */
  offset?: number | [number, number]
  /** Color of the pattern */
  color?: string
  /** Background color */
  bgColor?: string
  /** Custom styles */
  style?: CSSProperties
  /** Custom class name for the container */
  className?: string
  /** Custom class name for the pattern */
  patternClassName?: string
  /** Reference to the graph for viewport tracking */
  graphRef: React.RefObject<any>
  /** Canvas width */
  canvasWidth: number
  /** Canvas height */
  canvasHeight: number
}
