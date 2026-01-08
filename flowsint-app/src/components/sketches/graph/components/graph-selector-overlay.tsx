import { Info } from 'lucide-react'
import Lasso from '../../selectors/lasso'
import Rectangle from '../../selectors/rectangle'

interface GraphSelectorOverlayProps {
  isActive: boolean
  selectionMode: 'lasso' | 'rectangle'
  nodes: any[]
  graph2ScreenCoords: (node: any) => { x: number; y: number }
  containerSize: { width: number; height: number }
}

export const GraphSelectorOverlay: React.FC<GraphSelectorOverlayProps> = ({
  isActive,
  selectionMode,
  nodes,
  graph2ScreenCoords,
  containerSize
}) => {
  if (!isActive) return null

  return (
    <>
      <div className="absolute z-20 top-3 flex items-center gap-1 left-3 bg-primary/20 text-primary border border-primary/40 rounded-lg p-1 px-2 text-xs pointer-events-none">
        <Info className='h-3 w-3 ' />
        {selectionMode === 'lasso' ? 'Lasso' : 'Rectangle'} selection is active
      </div>
      {selectionMode === 'lasso' ? (
        <Lasso
          nodes={nodes}
          graph2ScreenCoords={graph2ScreenCoords}
          partial={true}
          width={containerSize.width}
          height={containerSize.height}
        />
      ) : (
        <Rectangle
          nodes={nodes}
          graph2ScreenCoords={graph2ScreenCoords}
          partial={true}
          width={containerSize.width}
          height={containerSize.height}
        />
      )}
    </>
  )
}
