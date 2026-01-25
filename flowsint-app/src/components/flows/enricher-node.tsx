import { memo, useCallback } from 'react'
import { Position } from '@xyflow/react'
import { Badge } from '../ui/badge'
import { BaseNode } from '../xyflow/base-node'
import { NodeStatusIndicator } from '../xyflow/node-status-indicator'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { cn } from '@/lib/utils'
import { Plus, TriangleAlert } from 'lucide-react'
import { type EnricherNodeProps } from '@/types/enricher'
import { FlowNode, useFlowStore } from '@/stores/flow-store'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { Button } from '../ui/button'
import { ButtonHandle } from '../xyflow/button-handle'
import { useIcon } from '@/hooks/use-icon'

// Custom equality function to prevent unnecessary re-renders
function areEqual(prevProps: EnricherNodeProps, nextProps: EnricherNodeProps) {
  return (
    prevProps.data.class_name === nextProps.data.class_name &&
    prevProps.data.name === nextProps.data.name &&
    prevProps.data.module === nextProps.data.module &&
    prevProps.data.documentation === nextProps.data.documentation &&
    prevProps.data.description === nextProps.data.description &&
    prevProps.data.key === nextProps.data.key &&
    prevProps.data.category === nextProps.data.category &&
    prevProps.data.color === nextProps.data.color &&
    prevProps.data.computationState === nextProps.data.computationState &&
    prevProps.isConnectable === nextProps.isConnectable
  )
}

const getStateColor = (state?: string) => {
  switch (state) {
    case 'pending':
      return 'bg-gray-200 text-gray-700'
    case 'processing':
      return 'bg-blue-100 text-blue-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'error':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-200 text-gray-700'
  }
}

// Enricher node component for enricher/enricher nodes only
const EnricherNode = memo(({ data, isConnectable }: EnricherNodeProps) => {
  const colors = useNodesDisplaySettings((s) => s.colors)
  const inputColor = colors[data.inputs.type.toLowerCase()]
  const outputColor = colors[data.outputs.type.toLowerCase()]
  const opacity = data.computationState === 'pending' ? 0.5 : 1
  const setOpenFlowSheet = useFlowStore((state) => state.setOpenFlowSheet)
  const Icon =
    data.type === 'type'
      ? useIcon(data.outputs.type.toLowerCase() as string)
      : data.icon
        ? useIcon(data.icon)
        : null

  const handleAddConnector = useCallback(() => {
    setOpenFlowSheet(true, data as unknown as FlowNode)
  }, [setOpenFlowSheet, data])

  const getStatusVariant = (state?: string) => {
    switch (state) {
      case 'pending':
        return 'pending'
      case 'processing':
        return 'loading'
      case 'completed':
        return 'success'
      case 'error':
        return 'error'
      default:
        return undefined
    }
  }
  const isConfigurationRequired = data.required_params

  return (
    <NodeStatusIndicator variant={getStatusVariant(data.computationState)} showStatus={true}>
      <BaseNode
        className={cn('shadow-md relative p-0 bg-background rounded-md !w-[300px]')}
        style={{
          borderLeftWidth: 5,
          borderRightWidth: 5,
          borderLeftColor: inputColor ?? outputColor,
          borderRightColor: outputColor,
          cursor: 'grab',
          opacity
        }}
        // selected={selected}
      >
        <div className="p-3 bg-card rounded-t-md">
          <div className="flex flex-col items-start gap-1 relative">
            <div className="absolute top-0 right-0 flex items-center gap-2">
              {data.computationState && (
                <Badge className={getStateColor(data.computationState)}>
                  {data.computationState}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 truncate text-ellipsis">
              {Icon && <Icon size={24} />}
              <div className="font-semibold text-sm">{data.class_name}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{data.description}</p>
          </div>
        </div>
        <div>
          <div className="grid grid-cols-2 py-1">
            <div className="pl-0 pr-6">
              {data?.inputs?.properties?.length > 0 && (
                <ButtonHandle
                  connectionCount={1}
                  showButton={false}
                  isConnectable={isConnectable}
                  id={data.inputs.type}
                  label={data.inputs.type}
                  type="target"
                  position={Position.Left}
                >
                  <Button
                    onClick={handleAddConnector}
                    size="icon"
                    variant="secondary"
                    className="rounded-full"
                  >
                    <Plus size={10} />
                  </Button>
                </ButtonHandle>
              )}
            </div>
            <div className="pr-0">
              {data?.outputs?.properties?.length > 0 && (
                <ButtonHandle
                  showButton={!data.computationState}
                  isConnectable={isConnectable}
                  id={data.outputs.type}
                  label={data.outputs.type}
                  type="source"
                  position={Position.Right}
                >
                  <Button
                    onClick={handleAddConnector}
                    size="icon"
                    variant="secondary"
                    className="rounded-full"
                  >
                    <Plus size={10} />
                  </Button>
                </ButtonHandle>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between px-3 gap-1 py-1">
            {data?.inputs?.properties?.length > 0 && (
              <Badge variant="outline">{data.inputs.type}</Badge>
            )}
            {data?.outputs?.properties?.length > 0 && (
              <Badge variant="outline">{data.outputs.type}</Badge>
            )}
          </div>
          {isConfigurationRequired && (
            <div className="absolute top-3 right-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TriangleAlert className="h-4 w-4 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configuration required</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </BaseNode>
    </NodeStatusIndicator>
  )
}, areEqual)

EnricherNode.displayName = 'EnricherNode'

export default EnricherNode
