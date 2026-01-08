import { type JSX, useCallback } from 'react'
import { useNodesDisplaySettings, TYPE_TO_ICON } from '@/stores/node-display-settings'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconType = string

interface IconProps {
  className?: string
  size?: number
  style?: React.CSSProperties
  showBorder?: boolean
  color?: string
  type?: string
  iconOnly?: boolean
}

const DEFAULT_SIZE = 24
const DEFAULT_COLOR = '#FFFFFF'
const BORDER_RATIO = 8
const CONTAINER_PADDING = 16
const BACKGROUND_PADDING = 8

export const useIcon = (type: IconType, src?: string | null) => {
  // Subscribe to store changes
  const colors = useNodesDisplaySettings((s) => s.colors)
  const customIcons = useNodesDisplaySettings((s) => s.customIcons)

  // Get icon name, checking custom icons first
  const iconName = customIcons[type] || TYPE_TO_ICON[type] || TYPE_TO_ICON.default

  return useCallback(
    ({
      className = '',
      size = DEFAULT_SIZE,
      style,
      showBorder = false,
      color,
      iconOnly = false
    }: IconProps): JSX.Element => {
      const resolvedColor = color || colors[type as keyof typeof colors] || DEFAULT_COLOR

      // Use full size for src images, scaled size for icons
      const actualIconSize = src ? size : size * 0.7

      // Si src est fourni, utiliser une image
      if (src) {
        const imageElement = (
          <img
            src={src}
            width={actualIconSize}
            height={actualIconSize}
            className={`object-contain flex-shrink-0 rounded-full ${className} p-0`}
            style={{
              minWidth: actualIconSize,
              minHeight: actualIconSize,
              maxWidth: actualIconSize,
              maxHeight: actualIconSize,
              ...(showBorder ? undefined : style)
            }}
            alt={`${type} icon`}
          />
        )
        if (iconOnly) return imageElement
      }

      // Utiliser une icône Lucide (PERFORMANT - pas de requête HTTP)
      const LucideIcon = (LucideIcons as any)[iconName] as React.ComponentType<{
        size?: number
        fontSize?: number
        className?: string
        style?: React.CSSProperties
      }>

      const iconElement = (
        <LucideIcon
          size={actualIconSize}
          fontSize={1}
          className={cn(`flex-shrink-0`, !iconOnly && !showBorder && 'text-white', className)}
          style={{
            ...(showBorder ? undefined : style)
          }}
        />
      )

      if (iconOnly) return iconElement

      if (showBorder) {
        const containerSize = size + CONTAINER_PADDING
        const borderWidth = Math.max(1, size / BORDER_RATIO)

        return (
          <div
            className="flex bg-card items-center justify-center rounded-full overflow-hidden flex-shrink-0"
            style={{
              border: `${borderWidth}px solid ${resolvedColor}`,
              width: containerSize,
              height: containerSize,
              minWidth: containerSize,
              minHeight: containerSize,
              maxWidth: containerSize,
              maxHeight: containerSize,
              ...style
            }}
          >
            {iconElement}
          </div>
        )
      }

      const containerSize = size + BACKGROUND_PADDING
      return (
        <div
          className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{
            background: resolvedColor,
            width: containerSize,
            height: containerSize,
            minWidth: containerSize,
            minHeight: containerSize,
            maxWidth: containerSize,
            maxHeight: containerSize
          }}
        >
          {iconElement}
        </div>
      )
    },
    [type, src, colors, iconName]
  )
}
