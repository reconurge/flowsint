import React, { memo, useCallback, useMemo, useState } from 'react'
import { enricherService } from '@/api/enricher-service'
import { flowService } from '@/api/flow-service'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FileCode2,
  Search,
  Info,
  Zap,
  BadgeCheck,
  BadgeAlert,
  Plus,
  Download,
  Trash2
} from 'lucide-react'
import { Enricher, Flow, GraphNode } from '@/types'
import { useLaunchFlow } from '@/hooks/use-launch-flow'
import { useLaunchEnricher } from '@/hooks/use-launch-enricher'
import { useParams } from '@tanstack/react-router'
import { capitalizeFirstLetter } from '@/lib/utils'
import BaseContextMenu from '@/components/xyflow/context-menu'
import { useGraphStore } from '@/stores/graph-store'
import { CopyButton } from '@/components/copy'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { useConfirm } from '@/components/use-confirm-dialog'
import { toast } from 'sonner'
import { sketchService } from '@/api/sketch-service'

interface GraphContextMenuProps {
  nodes: GraphNode[]
  top?: number
  left?: number
  right?: number
  bottom?: number
  rawTop?: number
  rawLeft?: number
  wrapperWidth: number
  wrapperHeight: number
  onEdit?: () => void
  onDelete?: () => void
  setMenu: (menu: any | null) => void
  [key: string]: any
}

export default function BackgroundContextMenu({
  nodes,
  top,
  left,
  right,
  bottom,
  wrapperWidth,
  wrapperHeight,
  onEdit,
  onDelete,
  setMenu,
  ...props
}: GraphContextMenuProps) {
  const { id: sketchId } = useParams({ strict: false })
  const [activeTab, setActiveTab] = useState('enrichers')
  const [enrichersSearchQuery, setEnrichersSearchQuery] = useState('')
  const [flowsSearchQuery, setFlowsSearchQuery] = useState('')
  const { launchFlow } = useLaunchFlow(false)
  const { launchEnricher } = useLaunchEnricher(false)
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const selectedNodeIds = selectedNodes.map((n) => n.id)
  const { confirm } = useConfirm()
  const removeNodes = useGraphStore((s) => s.removeNodes)
  const clearSelectedNodes = useGraphStore((s) => s.clearSelectedNodes)

  let sharedType = selectedNodes?.[0]?.nodeType
  const isSameType = selectedNodes.every((n) => n.nodeType === sharedType)
  sharedType = isSameType ? sharedType : ''
  const hasAny = isSameType && selectedNodeIds.length > 0

  const { data: enrichers, isLoading: isLoadingEnrichers } = useQuery({
    queryKey: ['enrichers', sharedType],
    queryFn: () => enricherService.get(capitalizeFirstLetter(sharedType)),
    enabled: isSameType && hasAny
  })

  const { data: flows, isLoading: isLoadingFlows } = useQuery({
    queryKey: ['flows', sharedType],
    queryFn: () => flowService.get(capitalizeFirstLetter(sharedType)),
    enabled: isSameType && hasAny
  })

  const filteredEnrichers =
    enrichers?.filter((enricher: Enricher) => {
      if (!enrichersSearchQuery.trim()) return true
      const query = enrichersSearchQuery.toLowerCase().trim()
      const matchesName = enricher.name?.toLowerCase().includes(query)
      const matchesDescription = enricher.description?.toLowerCase().includes(query)
      return matchesName || matchesDescription
    }) || []

  const filteredFlows =
    flows?.filter((flow: Flow) => {
      if (!flowsSearchQuery.trim()) return true
      const query = flowsSearchQuery.toLowerCase().trim()
      const matchesName = flow.name?.toLowerCase().includes(query)
      const matchesDescription = flow.description?.toLowerCase().includes(query)
      return matchesName || matchesDescription
    }) || []

  const handleFlowClick = (e: React.MouseEvent, flowId: string) => {
    e.stopPropagation()
    launchFlow(selectedNodeIds, flowId, sketchId)
    setMenu(null)
  }

  const handleEnricherClick = (e: React.MouseEvent, enricherName: string) => {
    e.stopPropagation()
    launchEnricher(selectedNodeIds, enricherName, sketchId)
    setMenu(null)
  }

  const handleDeleteNodes = useCallback(async () => {
    if (!selectedNodes.length || !sketchId) return
    if (
      !(await confirm({
        title: `You are about to delete ${selectedNodes.length} node(s).`,
        message: 'The action is irreversible.'
      }))
    )
      return

    toast.promise(
      (async () => {
        removeNodes(selectedNodes.map((n) => n.id))
        clearSelectedNodes()
        return sketchService.deleteNodes(
          sketchId as string,
          JSON.stringify({ nodeIds: selectedNodes.map((n) => n.id) })
        )
      })(),
      {
        loading: `Deleting ${selectedNodes.length} node(s)...`,
        success: 'Nodes deleted successfully.',
        error: 'Failed to delete selected nodes.'
      }
    )
  }, [selectedNodes, confirm, removeNodes, clearSelectedNodes, sketchId])

  return (
    <BaseContextMenu
      top={top}
      left={left}
      right={right}
      bottom={bottom}
      wrapperWidth={wrapperWidth}
      wrapperHeight={wrapperHeight}
      {...props}
    >
      {selectedNodeIds.length === 0 ? (
        <DefaultBackgroundMenu />
      ) : (
        <>
          {/* Header with title and action buttons */}
          <div className="px-3 py-2 border-b gap-1 border-border flex items-center justify-between shrink-0">
            <div className="flex text-xs items-center gap-1 truncate">
              <span className="block truncate">{selectedNodes.length} selected</span>
              {isSameType && <span className="block">- {sharedType}</span>}
            </div>
            <div className="grow" />
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 p-0 hover:bg-muted opacity-70 hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={handleDeleteNodes}
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} /> Delete{' '}
                      {selectedNodeIds.length}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete {selectedNodeIds.length} node(s)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-3 py-2 border-b border-border shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full h-9">
                <TabsTrigger
                  value="enrichers"
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Enrichers
                </TabsTrigger>
                <TabsTrigger value="flows" className="flex-1" onClick={(e) => e.stopPropagation()}>
                  <FileCode2 className="h-3 w-3 mr-1" />
                  Flows
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tab Content */}
          <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0">
            {/* Enrichers Tab */}
            <TabsContent value="enrichers" className="flex-1 flex flex-col min-h-0 mt-0">
              {/* Enrichers Search */}
              <div className="px-3 py-2 border-b border-border shrink-0">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search enrichers..."
                    value={enrichersSearchQuery}
                    onChange={(e) => {
                      e.stopPropagation()
                      setEnrichersSearchQuery(e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 pl-7 text-xs"
                  />
                </div>
              </div>

              {/* Enrichers List */}
              <div className="flex-1 grow overflow-auto min-h-0">
                {isLoadingEnrichers ? (
                  <div className="p-2 space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-md">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredEnrichers.length > 0 ? (
                  <div className="p-1">
                    {filteredEnrichers.map((enricher: Enricher) => (
                      <button
                        key={enricher.id}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left transition-colors"
                        onClick={(e) => handleEnricherClick(e, enricher.name)}
                      >
                        <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium flex gap-1 items-center truncate">
                            <span>
                              {enricher.wobblyType ? (
                                <BadgeAlert className="h-3 w-3 text-orange-400" />
                              ) : (
                                <BadgeCheck className="h-3 w-3 text-green-400" />
                              )}{' '}
                            </span>{' '}
                            {enricher.name || '(Unnamed enricher)'}
                          </p>
                          {enricher.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {enricher.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* <FavoriteButton isFavorite={false} /> */}
                          <InfoButton description={enricher.description ?? ''} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {enrichersSearchQuery ? 'No enrichers found' : 'No enrichers available'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Flows Tab */}
            <TabsContent value="flows" className="flex-1 flex flex-col min-h-0 mt-0">
              {/* Flows Search */}
              <div className="px-3 py-2 border-b border-border shrink-0">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search flows..."
                    value={flowsSearchQuery}
                    onChange={(e) => {
                      e.stopPropagation()
                      setFlowsSearchQuery(e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 pl-7 text-xs"
                  />
                </div>
              </div>

              {/* Flows List */}
              <div className="flex-1 grow overflow-auto min-h-0">
                {isLoadingFlows ? (
                  <div className="p-2 space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-md">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredFlows.length > 0 ? (
                  <div className="p-1">
                    {filteredFlows.map((flow: Flow) => (
                      <button
                        key={flow.id}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left transition-colors"
                        onClick={(e) => handleFlowClick(e, flow.id)}
                      >
                        <FileCode2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="flex items-center gap-1 text-sm font-medium truncate">
                            <span>
                              {flow.wobblyType ? (
                                <BadgeAlert className="h-3 w-3 text-orange-400" />
                              ) : (
                                <BadgeCheck className="h-3 w-3 text-green-400" />
                              )}{' '}
                            </span>{' '}
                            {flow.name || '(Unnamed flow)'}
                          </p>
                          {flow.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {flow.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* <FavoriteButton isFavorite={false} /> */}
                          <InfoButton description={flow.description} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {flowsSearchQuery ? 'No flows found' : 'No flows available'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          {selectedNodes.length > 0 && (
            <div className="border-t p-1">
              <SubActions selectedNodes={selectedNodes} />
            </div>
          )}
        </>
      )}
    </BaseContextMenu>
  )
}

const DefaultBackgroundMenu = memo(() => {
  const setOpenMainDialog = useGraphStore((state) => state.setOpenMainDialog)
  const setImportModalOpen = useGraphSettingsStore((s) => s.setImportModalOpen)

  const handleOpenNewAddItemDialog = useCallback(() => {
    setOpenMainDialog(true)
  }, [setOpenMainDialog])

  const handleOpenImportDialog = useCallback(() => {
    setImportModalOpen(true)
  }, [setImportModalOpen])

  return (
    <div className="flex-1 grow text-sm overflow-hidden min-h-0">
      <button
        className="w-full rounded-t-md flex items-center gap-2 p-2 hover:bg-muted text-left transition-colors"
        onClick={handleOpenNewAddItemDialog}
      >
        <Plus className="h-4 w-4 opacity-60" /> Add a new entity
      </button>
      <button
        className="w-full rounded-b-md flex items-center gap-2 p-2 hover:bg-muted text-left transition-colors"
        onClick={handleOpenImportDialog}
      >
        <Download className="h-4 w-4 opacity-60" /> Import entities
      </button>
    </div>
  )
})

type SubActionsProps = {
  selectedNodes: GraphNode[]
}
const SubActions = memo(({ selectedNodes }: SubActionsProps) => {
  const contentToCopy = useMemo(() => selectedNodes.map((node) => node.nodeLabel).join('\n'), [])
  return (
    <div>
      <CopyButton label={`Copy ${selectedNodes.length} items as txt`} content={contentToCopy} />
    </div>
  )
})

const InfoButton = ({ description }: { description?: string }) => {
  if (!description) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5"
            variant="ghost"
            size={'icon'}
          >
            <Info className="w-4 h-4 opacity-50" strokeWidth={1.5} />
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="whitespace-pre-wrap">{description}</p>
      </TooltipContent>
    </Tooltip>
  )
}
