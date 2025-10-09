import { type JSX, useMemo, useCallback } from 'react'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'

export type IconType = string

interface IconProps {
  className?: string
  size?: number
  style?: React.CSSProperties
  showBorder?: boolean
  color?: string
  type?: string
}

// Utilisation de constantes pour les valeurs par défaut
const DEFAULT_SIZE = 24
const DEFAULT_COLOR = '#000000'
const BORDER_RATIO = 8
const CONTAINER_PADDING = 16
const BACKGROUND_PADDING = 8

// Fonctions utilitaires memoizées
const getIconPath = (type: string): string => `/icons/${type}.svg`

const getDefaultIconPath = (): string => `/icons/default.svg`

export const useIcon = (type: IconType, src?: string | null) => {
  const iconPath = useMemo(() => getIconPath(type), [type])
  const defaultIconPath = useMemo(() => getDefaultIconPath(), [])

  return useCallback(
    ({
      className = '',
      size = DEFAULT_SIZE,
      style,
      showBorder = false,
      color,
      // @ts-ignore
      type: iconType
    }: IconProps): JSX.Element => {
      const colors = useNodesDisplaySettings((s) => s.colors)
      const resolvedColor = color || colors[type as keyof typeof colors] || DEFAULT_COLOR

      // Gestion de l'erreur de chargement d'image
      const handleImageError = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement>) => {
          const target = e.currentTarget
          if (target.src !== defaultIconPath) {
            target.src = defaultIconPath
          }
        },
        [defaultIconPath]
      )

      // Use full size for src images, scaled size for icons
      const actualIconSize = src ? size : size * 0.7

      const imageElement = (
        <img
          src={src || iconPath}
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
          onError={handleImageError}
        />
      )

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
            {imageElement}
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
          {imageElement}
        </div>
      )
    },
    [iconPath, defaultIconPath, type]
  )
}
