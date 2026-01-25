import { memo, useCallback } from 'react'
import { Position } from '@xyflow/react'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { useIcon } from '@/hooks/use-icon'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { type EnricherNodeProps } from '@/types/enricher'
import { ButtonHandle } from '@/components/xyflow/button-handle'
import { Button } from '../ui/button'
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger
} from '@/components/xyflow/node-tooltip'
import { BaseNode, BaseNodeContent } from '@/components/xyflow/base-node'
import { FlowNode, useFlowStore } from '@/stores/flow-store'

// Custom equality function to prevent unnecessary re-renders
function areEqual(prevProps: EnricherNodeProps, nextProps: EnricherNodeProps) {
  return (
    prevProps.data.class_name === nextProps.data.class_name &&
    prevProps.data.name === nextProps.data.name &&
    prevProps.data.color === nextProps.data.color &&
    prevProps.isConnectable === nextProps.isConnectable
  )
}

// Type node component for data types (domains, websites, IPs, etc.)
const TypeNode = memo(({ data }: EnricherNodeProps) => {
  const colors = useNodesDisplaySettings((s) => s.colors)
  const outputColor = colors[data.outputs.type.toLowerCase()]
  const Icon = useIcon(data.outputs.type.toLowerCase() as string)
  const setOpenFlowSheet = useFlowStore((state) => state.setOpenFlowSheet)
  const key = data.outputs.properties[0].name

  const handleAddConnector = useCallback(() => {
    setOpenFlowSheet(true, data as unknown as FlowNode)
  }, [setOpenFlowSheet, data])

  return (
    <NodeTooltip>
      <NodeTooltipContent
        isVisible={true}
        position={Position.Top}
        className="text-center bg-background text-foreground border shadow-md"
      >
        {data.name}
      </NodeTooltipContent>
      <BaseNode
        className={cn('shadow-md relative p-0 pl-1.5 bg-background !max-w-[240px]')}
        style={{
          borderWidth: 2,
          borderColor: outputColor,
          cursor: 'grab',
          borderRadius: '35px 10px 10px 35px'
        }}
        // selected={selected}
      >
        <BaseNodeContent>
          <NodeTooltipTrigger>
            <div className="p-4 flex items-center justify-center">
              <Icon size={32} />
            </div>
            <ButtonHandle
              type="source"
              id={data.outputs.type}
              position={Position.Right}
              showButton={true}
              label={key}
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
          </NodeTooltipTrigger>
        </BaseNodeContent>
      </BaseNode>
    </NodeTooltip>
  )
}, areEqual)

TypeNode.displayName = 'TypeNode'

export default TypeNode
