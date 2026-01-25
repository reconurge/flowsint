import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { FlowEdge, FlowNode, useFlowStore } from '@/stores/flow-store'
import { memo, useCallback, useMemo, useState } from 'react'
import { TriangleAlert, Loader2, ArrowRight } from 'lucide-react'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { Enricher } from '@/types/enricher'
import { useQuery } from '@tanstack/react-query'
import { Input } from '../ui/input'
import { Alert, AlertDescription } from '../ui/alert'
import { useIcon } from '@/hooks/use-icon'
import { flowService } from '@/api/flow-service'

const FlowSheet = ({ onLayout }: { onLayout: () => void }) => {
  const openFlowSheet = useFlowStore((state) => state.openFlowSheet)
  const setOpenFlowSheet = useFlowStore((state) => state.setOpenFlowSheet)
  const selectedNode = useFlowStore((state) => state.selectedNode)
  const setNodes = useFlowStore((state) => state.setNodes)
  const setEdges = useFlowStore((state) => state.setEdges)
  const colors = useNodesDisplaySettings((s) => s.colors)

  const {
    data: materials,
    isLoading,
    error
  } = useQuery({
    queryKey: ['raw_material', selectedNode?.data.outputs.type],
    enabled: !!selectedNode?.data.outputs.type,
    queryFn: () =>
      flowService.getRawMaterialForType(selectedNode?.data.outputs.type.toLowerCase() || '')
  })
  const [searchTerm, setSearchTerm] = useState<string>('')

  const filteredEnrichers = useMemo(() => {
    if (!materials?.items || !selectedNode) return []
    if (!searchTerm.trim()) {
      return materials?.items
    }
    const term = searchTerm.toLowerCase()
    return materials?.items.filter((enricher: Enricher) => {
      return (
        enricher.class_name.toLowerCase().includes(term) ||
        enricher.name.toLowerCase().includes(term) ||
        enricher.module.toLowerCase().includes(term) ||
        enricher.inputs.type.toLowerCase().includes(term) ||
        enricher.outputs.type.toLowerCase().includes(term) ||
        (enricher.documentation && enricher.documentation.toLowerCase().includes(term))
      )
    })
  }, [searchTerm, materials?.items, selectedNode])

  const handleClick = useCallback(
    (enricher: Enricher) => {
      if (!selectedNode) return
      const position = { x: selectedNode.position.x + 350, y: selectedNode.position.y }
      const newNode: FlowNode = {
        id: `${enricher.name}-${Date.now()}`,
        type: enricher.type === 'type' ? 'type' : 'enricher',
        position,
        data: {
          id: enricher.id,
          class_name: enricher.class_name,
          module: enricher.module || '',
          key: enricher.name,
          color: colors[enricher.category.toLowerCase()] || '#94a3b8',
          name: enricher.name,
          category: enricher.category,
          type: enricher.type,
          inputs: enricher.inputs,
          outputs: enricher.outputs,
          documentation: enricher.documentation,
          description: enricher.description,
          required_params: enricher.required_params,
          params: enricher.params,
          params_schema: enricher.params_schema,
          icon: enricher.icon
        }
      }
      setNodes((prev) => [...prev, newNode])

      const connection: FlowEdge = {
        id: `${selectedNode.id}-${newNode.id}`,
        source: selectedNode.id,
        target: newNode.id,
        sourceHandle: selectedNode.data.outputs.type,
        targetHandle: enricher.inputs.type
      }
      setEdges((prev) => [...prev, connection])
      // onLayout && onLayout()
      setOpenFlowSheet(false)
    },
    [selectedNode, setNodes, setEdges, onLayout, setOpenFlowSheet]
  )

  return (
    <div>
      <Sheet open={openFlowSheet} onOpenChange={setOpenFlowSheet}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              Add connector to <span className="text-primary">{selectedNode?.data.class_name}</span>
            </SheetTitle>
            <SheetDescription>Choose an enricher to launch from the list below.</SheetDescription>
          </SheetHeader>
          <div className="p-4 grow overflow-auto border-t">
            <Input
              placeholder="Search enrichers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading enrichers...</span>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <TriangleAlert className="h-4 w-4" />
                <AlertDescription>Failed to load enrichers. Please try again.</AlertDescription>
              </Alert>
            )}

            {!isLoading && !error && (
              <div className="flex flex-col gap-2">
                {filteredEnrichers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm.trim()
                      ? 'No enrichers found matching your search.'
                      : 'No enrichers available for this node type.'}
                  </div>
                ) : (
                  filteredEnrichers.map((enricher: Enricher) => (
                    <EnricherItem
                      key={enricher.id}
                      enricher={enricher}
                      onClick={() => handleClick(enricher)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default FlowSheet

// Custom equality function for EnricherItem
function areEqual(prevProps: { enricher: Enricher }, nextProps: { enricher: Enricher }) {
  return (
    prevProps.enricher.class_name === nextProps.enricher.class_name &&
    prevProps.enricher.name === nextProps.enricher.name &&
    prevProps.enricher.module === nextProps.enricher.module &&
    prevProps.enricher.documentation === nextProps.enricher.documentation
  )
}

// Memoized enricher item component for the sidebar
const EnricherItem = memo(
  ({ enricher, onClick }: { enricher: Enricher; onClick: () => void }) => {
    const colors = useNodesDisplaySettings((s) => s.colors)
    const borderInputColor = colors[enricher.inputs.type.toLowerCase()]
    const borderOutputColor = colors[enricher.outputs.type.toLowerCase()]
    const Icon =
      enricher.type === 'type'
        ? useIcon(enricher.outputs.type.toLowerCase() as string)
        : enricher.icon
          ? useIcon(enricher.icon)
          : null

    return (
      <TooltipProvider>
        <button
          onClick={onClick}
          className="p-3 rounded-md relative w-full overflow-hidden cursor-grab bg-card border ring-2 ring-transparent hover:ring-primary transition-all group"
          style={{
            borderLeftWidth: '5px',
            borderRightWidth: '5px',
            borderLeftColor: borderInputColor ?? borderOutputColor,
            borderRightColor: borderOutputColor,
            cursor: 'grab'
          }}
        >
          <div className="flex justify-between grow items-start">
            <div className="flex items-start gap-2 grow truncate text-ellipsis">
              <div className="space-y-1 truncate text-left">
                <div className="flex items-center gap-2 truncate text-ellipsis">
                  {Icon && <Icon size={24} />}
                  <h3 className="text-sm font-medium truncate text-ellipsis">
                    {enricher.class_name}
                  </h3>
                </div>
                <p className="text-sm font-normal opacity-60 truncate text-ellipsis">
                  {enricher.description}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Takes</span>
                    <span className="font-bold truncate text-ellipsis">
                      {enricher.inputs.type}
                    </span>
                  </div>
                  <span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Returns</span>
                    <span className="font-bold truncate text-ellipsis">
                      {enricher.outputs.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {enricher.required_params && (
            <div className="absolute bottom-3 right-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TriangleAlert className="h-4 w-4 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>API key required</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </button>
      </TooltipProvider>
    )
  },
  areEqual
)

EnricherItem.displayName = 'EnricherItem'
