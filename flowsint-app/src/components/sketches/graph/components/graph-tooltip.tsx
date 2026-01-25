import { Type, Share2 } from 'lucide-react'
import { TooltipState } from '../utils/types'

interface GraphTooltipProps {
  tooltip: TooltipState
}

export const GraphTooltip: React.FC<GraphTooltipProps> = ({ tooltip }) => {
  if (!tooltip.visible || !tooltip.data) return null

  return (
    <div
      className="absolute z-20 bg-background border rounded-lg p-2 shadow-lg text-xs pointer-events-none"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="whitespace-pre-line truncate flex flex-col gap-1">
        <span className="text-md font-semibold">{tooltip.data.label}</span>
        <span className="flex items-center gap-1">
          <span className="flex items-center gap-1 opacity-60">
            <Type className="h-3 w-3" /> type:
          </span>{' '}
          <span className="font-medium">{tooltip.data.type}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="flex items-center gap-1 opacity-60">
            <Share2 className="h-3 w-3" /> connections:
          </span>{' '}
          <span className="font-medium">{tooltip.data.connections}</span>
        </span>
      </div>
    </div>
  )
}
