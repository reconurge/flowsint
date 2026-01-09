import { CSSProperties, memo, useRef, useState, useEffect } from 'react'
import { DotPattern, LinePattern } from './background-patterns'
import { type BackgroundProps, BackgroundVariant } from './background-types'
import { CONSTANTS } from '../utils/constants'
import { cn } from '@/lib/utils'

const defaultSize = {
  [BackgroundVariant.Dots]: 1,
  [BackgroundVariant.Lines]: 1,
  [BackgroundVariant.Cross]: 6
}

function BackgroundComponent({
  id,
  variant = BackgroundVariant.Dots,
  gap = 20,
  size,
  lineWidth = 1,
  offset = 0,
  color = 'rgba(128, 128, 128, 0.3)',
  bgColor = 'transparent',
  style,
  className,
  patternClassName,
  graphRef,
  canvasWidth,
  canvasHeight
}: BackgroundProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const patternRef = useRef<SVGPatternElement>(null)
  const dotGroupRef = useRef<SVGGElement>(null)
  const rafRef = useRef<number | null>(null)
  const lastTransformRef = useRef<{ x: number; y: number; zoom: number } | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  const patternSize = size || defaultSize[variant]
  const isDots = variant === BackgroundVariant.Dots
  const isCross = variant === BackgroundVariant.Cross
  const gapXY: [number, number] = Array.isArray(gap) ? gap : [gap, gap]
  const offsetXY: [number, number] = Array.isArray(offset) ? offset : [offset, offset]

  const patternId = `pattern-${id || 'default'}-${variant}`

  // Update transform based on graph viewport changes
  useEffect(() => {
    const updateTransform = () => {
      if (!graphRef.current || !patternRef.current) return false

      try {
        // Get zoom level
        const zoom = graphRef.current.zoom?.() || 1

        // Get center position in world coordinates
        let centerX = 0
        let centerY = 0

        if (typeof graphRef.current.centerAt === 'function') {
          const center = graphRef.current.centerAt()
          centerX = center?.x ?? 0
          centerY = center?.y ?? 0
        }

        // Convert world coordinates to screen offset
        const screenX = canvasWidth / 2 - centerX * zoom
        const screenY = canvasHeight / 2 - centerY * zoom

        // Check visibility based on zoom threshold (same as labels)
        const shouldBeVisible = zoom > CONSTANTS.ZOOM_NODE_DETAIL_THRESHOLD
        if (shouldBeVisible !== isVisible) {
          setIsVisible(shouldBeVisible)
        }

        // Only update pattern if visible
        if (!shouldBeVisible) return false

        const last = lastTransformRef.current
        if (!last) {
          lastTransformRef.current = { x: screenX, y: screenY, zoom }
          // Update pattern attributes directly without re-render
          updatePatternAttributes(screenX, screenY, zoom)
          return true
        }

        // Check if transform changed significantly
        const zoomChanged = Math.abs(zoom - last.zoom) > 0.0001
        const posChanged = Math.abs(screenX - last.x) > 0.5 || Math.abs(screenY - last.y) > 0.5

        if (zoomChanged || posChanged) {
          lastTransformRef.current = { x: screenX, y: screenY, zoom }
          // Update pattern attributes directly without re-render
          updatePatternAttributes(screenX, screenY, zoom)
          return true
        }

        return false
      } catch {
        return false
      }
    }

    // Direct DOM manipulation to avoid re-renders
    const updatePatternAttributes = (screenX: number, screenY: number, zoom: number) => {
      if (!patternRef.current) return

      const scaledGap: [number, number] = [gapXY[0] * zoom, gapXY[1] * zoom]
      const scaledSize = patternSize * zoom
      const patternDimensions: [number, number] = isCross ? [scaledSize, scaledSize] : scaledGap
      const scaledOffset: [number, number] = [
        offsetXY[0] * zoom || 1 + patternDimensions[0] / 2,
        offsetXY[1] * zoom || 1 + patternDimensions[1] / 2
      ]

      // Update pattern attributes directly
      patternRef.current.setAttribute('x', String(screenX % scaledGap[0]))
      patternRef.current.setAttribute('y', String(screenY % scaledGap[1]))
      patternRef.current.setAttribute('width', String(scaledGap[0]))
      patternRef.current.setAttribute('height', String(scaledGap[1]))
      patternRef.current.setAttribute(
        'patternTransform',
        `translate(-${scaledOffset[0]},-${scaledOffset[1]})`
      )

      // Update dot/line size if needed
      if (isDots && dotGroupRef.current) {
        const dotElement = dotGroupRef.current.querySelector('circle')
        if (dotElement) {
          dotElement.setAttribute('r', String(scaledSize / 2))
          dotElement.setAttribute('cx', String(scaledGap[0] / 2))
          dotElement.setAttribute('cy', String(scaledGap[1] / 2))
        }
      }
    }

    // Initial transform
    updateTransform()

    // Use requestAnimationFrame for smooth synchronization
    // Only triggers re-render when transform actually changes
    const animate = () => {
      updateTransform()
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [graphRef, canvasWidth, canvasHeight, isVisible])

  return (
    <svg
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={
        {
          ...style,
          width: canvasWidth,
          height: canvasHeight,
          '--bg-color': bgColor,
          '--pattern-color': color,
          // Hide with CSS instead of unmounting to keep useEffect running
          opacity: isVisible ? 1 : 0,
          visibility: isVisible ? 'visible' : 'hidden'
        } as CSSProperties
      }
      ref={svgRef}
      data-background-variant={variant}
    >
      <defs>
        <pattern
          ref={patternRef}
          id={patternId}
          x="0"
          y="0"
          width={gapXY[0]}
          height={gapXY[1]}
          patternUnits="userSpaceOnUse"
          patternTransform="translate(0,0)"
        >
          {isDots ? (
            <g ref={dotGroupRef} style={{ color }}>
              <DotPattern
                radius={patternSize / 2}
                centerX={gapXY[0] / 2}
                centerY={gapXY[1] / 2}
                className={patternClassName}
              />
            </g>
          ) : (
            <LinePattern
              dimensions={[gapXY[0], gapXY[1]]}
              lineWidth={lineWidth}
              variant={variant}
              className={patternClassName}
            />
          )}
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={bgColor} />
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} style={{ color }} />
    </svg>
  )
}

BackgroundComponent.displayName = 'Background'

export const Background = memo(BackgroundComponent)
