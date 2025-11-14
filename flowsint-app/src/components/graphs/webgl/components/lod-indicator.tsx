import React from 'react'
import { getLODLevel } from '../utils/visibility-calculator'

interface LODIndicatorProps {
  zoomLevel: number
  visible?: boolean
}

/**
 * LOD Indicator - Debug component to show current Level of Detail
 * Useful for development to understand when features are visible
 *
 * @example
 * ```tsx
 * <LODIndicator zoomLevel={currentZoom} visible={isDevelopment} />
 * ```
 */
export const LODIndicator: React.FC<LODIndicatorProps> = ({ zoomLevel, visible = true }) => {
  if (!visible) return null

  const lodLevel = getLODLevel(zoomLevel)

  const getLODColor = (level: string) => {
    switch (level) {
      case 'minimal':
        return 'bg-red-500/80'
      case 'low':
        return 'bg-orange-500/80'
      case 'medium':
        return 'bg-yellow-500/80'
      case 'high':
        return 'bg-green-500/80'
      default:
        return 'bg-gray-500/80'
    }
  }

  const getLODDescription = (level: string) => {
    switch (level) {
      case 'minimal':
        return 'Nodes + Edges only'
      case 'low':
        return 'Basic labels visible'
      case 'medium':
        return 'Icons visible'
      case 'high':
        return 'All features visible'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="pointer-events-none absolute top-4 right-4 z-50 select-none">
      <div className="flex flex-col gap-1 rounded-lg border border-white/20 bg-black/60 p-3 text-xs backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${getLODColor(lodLevel)}`} />
          <span className="font-semibold text-white">
            LOD: {lodLevel.toUpperCase()}
          </span>
        </div>
        <div className="text-gray-300">{getLODDescription(lodLevel)}</div>
        <div className="text-gray-400">Zoom: {zoomLevel.toFixed(2)}x</div>
      </div>
    </div>
  )
}

export default LODIndicator
