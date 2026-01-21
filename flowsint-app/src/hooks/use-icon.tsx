import { type JSX, useCallback } from 'react'
import { useNodesDisplaySettings, TYPE_TO_ICON } from '@/stores/node-display-settings'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconType = string

export type UseIconOptions = {
  nodeColor?: string | null
  nodeIcon?: keyof typeof LucideIcons | null
  nodeImage?: string | null
}

interface IconProps {
  className?: string
  size?: number
  style?: React.CSSProperties
  showBorder?: boolean
  color?: string
  type?: string
}

const DEFAULT_SIZE = 24
const DEFAULT_COLOR = '#FFFFFF'
const BORDER_RATIO = 8
const CONTAINER_PADDING = 16
const BACKGROUND_PADDING = 8

export const useIcon = (type: IconType, options?: UseIconOptions) => {
  const { nodeColor, nodeIcon, nodeImage } = options ?? {}

  // Subscribe to store changes
  const colors = useNodesDisplaySettings((s) => s.colors)
  const customIcons = useNodesDisplaySettings((s) => s.customIcons)

  // Priority: nodeIcon -> customIcons[type] -> TYPE_TO_ICON[type] -> default
  const iconName = nodeIcon || customIcons[type] || TYPE_TO_ICON[type] || TYPE_TO_ICON.default

  return useCallback(
    ({
      className = '',
      size = DEFAULT_SIZE,
      style,
      showBorder = false,
      color
    }: IconProps): JSX.Element => {
      // Priority for color: color prop -> nodeColor -> colors[type] -> default
      const resolvedColor =
        color || nodeColor || colors[type as keyof typeof colors] || DEFAULT_COLOR

      // Priority: nodeImage first - images are returned directly (no background)
      if (nodeImage) {
        const containerSize = size + BACKGROUND_PADDING
        const imageSize = containerSize * 0.9

        const imageElement = (
          <img
            src={nodeImage}
            width={imageSize}
            height={imageSize}
            className={`object-cover shrink-0 rounded-full ${className} p-0`}
            style={{
              minWidth: imageSize,
              minHeight: imageSize,
              maxWidth: imageSize,
              maxHeight: imageSize
            }}
            alt={`${type} icon`}
          />
        )

        if (showBorder) {
          const borderedContainerSize = size + CONTAINER_PADDING
          const borderedImageSize = borderedContainerSize * 0.9
          const borderWidth = Math.max(1, size / BORDER_RATIO)

          const borderedImageElement = (
            <img
              src={nodeImage}
              width={borderedImageSize}
              height={borderedImageSize}
              className={`object-cover shrink-0 rounded-full ${className} p-0`}
              style={{
                minWidth: borderedImageSize,
                minHeight: borderedImageSize,
                maxWidth: borderedImageSize,
                maxHeight: borderedImageSize
              }}
              alt={`${type} icon`}
            />
          )

          return (
            <div
              className="flex bg-card items-center justify-center rounded-full overflow-hidden shrink-0"
              style={{
                border: `${borderWidth}px solid ${resolvedColor}`,
                width: borderedContainerSize,
                height: borderedContainerSize,
                minWidth: borderedContainerSize,
                minHeight: borderedContainerSize,
                maxWidth: borderedContainerSize,
                maxHeight: borderedContainerSize,
                ...style
              }}
            >
              {borderedImageElement}
            </div>
          )
        }

        return (
          <div
            className="rounded-full flex items-center justify-center overflow-hidden shrink-0"
            style={{
              width: containerSize,
              height: containerSize,
              minWidth: containerSize,
              minHeight: containerSize,
              maxWidth: containerSize,
              maxHeight: containerSize,
              ...style
            }}
          >
            {imageElement}
          </div>
        )
      }

      // Fallback to Lucide icon - icons need colored background
      const actualIconSize = size * 0.7
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
          className={cn('shrink-0', !showBorder && 'text-white', className)}
          style={{
            ...(showBorder ? undefined : style)
          }}
        />
      )

      if (showBorder) {
        const containerSize = size + CONTAINER_PADDING
        const borderWidth = Math.max(1, size / BORDER_RATIO)

        return (
          <div
            className="flex bg-card items-center justify-center rounded-full overflow-hidden shrink-0"
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
          className="rounded-full flex items-center justify-center overflow-hidden shrink-0"
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
    [type, nodeImage, nodeColor, colors, iconName]
  )
}
