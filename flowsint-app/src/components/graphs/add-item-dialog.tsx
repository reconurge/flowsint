import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn, flattenObj } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { type ActionItem, type FormField, findActionItemByKey } from '@/lib/action-items'
import { Card, CardContent } from '@/components/ui/card'
import { AnimatePresence, motion } from 'framer-motion'
import { DynamicForm } from '@/components/graphs/dynamic-form'
import { Badge } from '@/components/ui/badge'
import { useGraphStore } from '@/stores/graph-store'
import { sketchService } from '@/api/sketch-service'
import { useParams } from '@tanstack/react-router'
import { useIcon } from '@/hooks/use-icon'
import { useLayoutStore } from '@/stores/layout-store'
import { useActionItems } from '@/hooks/use-action-items'
import { GraphNode } from '@/types'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'

export default function AddItemDialog() {
  const handleOpenFormModal = useGraphStore((state) => state.handleOpenFormModal)
  const currentNodeType = useGraphStore((state) => state.currentNodeType)
  const setCurrentNode = useGraphStore((state) => state.setCurrentNode)
  const relatedNodeToAdd = useGraphStore((state) => state.relatedNodeToAdd)
  const setRelatedNodeToAdd = useGraphStore((state) => state.setRelatedNodeToAdd)
  const openMainDialog = useGraphStore((state) => state.openMainDialog)
  const setOpenMainDialog = useGraphStore((state) => state.setOpenMainDialog)
  const openFormDialog = useGraphStore((state) => state.openFormDialog)
  const setOpenFormDialog = useGraphStore((state) => state.setOpenFormDialog)
  const addNode = useGraphStore((state) => state.addNode)
  const addEdge = useGraphStore((state) => state.addEdge)
  const replaceNodeId = useGraphStore((state) => state.replaceNodeId)
  const setActiveTab = useLayoutStore((state) => state.setActiveTab)
  const setImportModalOpen = useGraphSettingsStore((s) => s.setImportModalOpen)
  const { id: sketch_id } = useParams({ strict: false })
  const { actionItems, isLoading } = useActionItems()

  const [currentParent, setCurrentParent] = useState<ActionItem | null>(null)
  const [navigationHistory, setNavigationHistory] = useState<ActionItem[]>([])

  const generateTempId = () => {
    // Generate a temporary ID in the format: temp:uuid:0
    const uuid = uuidv4()
    return `temp:${uuid}:0`
  }

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setOpenMainDialog(open)
      if (!open) {
        setRelatedNodeToAdd(null)
      }
    },
    [setOpenMainDialog, setRelatedNodeToAdd]
  )

  const handleImportData = useCallback(() => {
    setOpenMainDialog(false)
    setImportModalOpen(true)
  }, [setOpenMainDialog, setImportModalOpen])

  const handleAddNode = async (data: any) => {
    if (!currentNodeType || !sketch_id) {
      toast.error('Invalid node type or sketch ID.')
      return
    }

    const label_key =
      currentNodeType.fields.find((f: FormField) => f.name === currentNodeType.label_key)?.name ||
      currentNodeType.fields[0].name
    const type = currentNodeType.type
    const label = data[label_key as keyof typeof data]

    const newNode = {
      type: 'custom',
      label: label,
      data: {
        ...flattenObj(data),
        label,
        type: type.toLowerCase()
      }
    }

    // Generate temporary ID for optimistic update
    const tempId = generateTempId()
    // Optimistically add the node to local state with temporary ID
    const nodeWithTempId: GraphNode = {
      id: tempId,
      data: {
        ...newNode.data,
        id: tempId,
        created_at: new Date().toISOString()
      }
    }
    if (addNode) {
      addNode(nodeWithTempId)
    }
    // Optimistically add edge if we have a related node
    let tempEdgeId: string | null = null
    if (relatedNodeToAdd) {
      const tempEdgePayload = {
        type: 'custom',
        label: `HAS_${newNode.data.type.toUpperCase()}`,
        source: relatedNodeToAdd.id,
        target: tempId
      }
      if (addEdge) {
        const tempEdge = addEdge(tempEdgePayload)
        tempEdgeId = tempEdge.id
      }
    }
    // Set current node optimistically
    if (setCurrentNode) {
      setCurrentNode(nodeWithTempId)
    }
    setActiveTab('entities')
    // Close dialogs immediately for better UX
    setOpenMainDialog(false)
    setOpenFormDialog(false)
    // Show optimistic success message
    toast.success(
      relatedNodeToAdd
        ? `New relation added to ${relatedNodeToAdd.data.label}.`
        : 'New node added.'
    )
    // Make API calls in the background
    try {
      // Create the node via API to get the real database ID
      const newNodeResponse = await sketchService.addNode(
        sketch_id as string,
        JSON.stringify(newNode)
      )
      if (newNodeResponse.node && replaceNodeId) {
        // Replace the temporary ID with the real ID from the API
        replaceNodeId(tempId, newNodeResponse.node.id)
        // If we have a related node, create the edge with the real ID
        if (relatedNodeToAdd && tempEdgeId) {
          const relationPayload = {
            source: relatedNodeToAdd.id,
            target: newNodeResponse.node.id,
            type: 'one-way',
            label: `HAS_${newNode.data.type.toUpperCase()}`
          }
          // Make API call to persist the edge
          await sketchService.addEdge(sketch_id as string, JSON.stringify(relationPayload))
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to sync node with server. Please refresh.')
    }
  }

  const navigateToSubItems = (item: ActionItem) => {
    setNavigationHistory([...navigationHistory, item])
    setCurrentParent(item)
  }

  const navigateBack = () => {
    const newHistory = [...navigationHistory]
    newHistory.pop()
    setNavigationHistory(newHistory)
    setCurrentParent(newHistory.length > 0 ? newHistory[newHistory.length - 1] : null)
  }

  const renderActionCards = () => {
    const items = currentParent ? currentParent.children || [] : actionItems

    if (!items || items.length === 0) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No action items available</p>
          </div>
        </div>
      )
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentParent?.id || 'root'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-3 cq-sm:grid-cols-4 cq-md:grid-cols-5 cq-lg:grid-cols-6 cq-xl:grid-cols-6 gap-3 p-1 pb-2"
        >
          {items.map((item) => (
            <ActionCard
              key={item.id}
              item={item}
              onSelect={
                item.children
                  ? () => navigateToSubItems(item)
                  : () => handleOpenFormModal(findActionItemByKey(item.key, actionItems))
              }
            />
          ))}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <>
      <Dialog open={openMainDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[800px] h-[80vh] overflow-hidden flex flex-col">
          <DialogTitle className="flex items justify-between">
            <div className="flex items-center">
              {currentParent && (
                <Button variant="ghost" size="icon" className="mr-2" onClick={navigateBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {relatedNodeToAdd
                ? `Add a relation to `
                : currentParent
                  ? currentParent.label
                  : 'Select an item to insert'}
              {relatedNodeToAdd && (
                <span className="text-primary truncate max-w-[50%] text-ellipsis font-semibold ml-1">
                  {relatedNodeToAdd.data.label}
                </span>
              )}
            </div>
            <div className='pt-6'>
              <Button
                size="sm"
                onClick={handleImportData}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {relatedNodeToAdd
              ? 'Choose what type of relation to add to this node.'
              : currentParent
                ? `Select a type of ${currentParent.label.toLowerCase()} to add`
                : 'Choose an item to insert manually, or import data from a file.'}
          </DialogDescription>

          <div className="overflow-y-auto overflow-x-hidden pr-1 -mr-1 flex-grow @container">
            {isLoading ? (
              <div className="grid grid-cols-3 cq-sm:grid-cols-4 cq-md:grid-cols-5 cq-lg:grid-cols-6 cq-xl:grid-cols-6 gap-3 p-1 pb-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="h-full">
                    <CardContent className="p-2 relative flex flex-col items-center text-center h-full">
                      <div className="w-8 h-8 rounded-full bg-muted animate-pulse mb-3 mt-2"></div>
                      <div className="h-4 bg-muted rounded animate-pulse w-20 mb-2"></div>
                      <div className="h-3 bg-muted rounded animate-pulse w-32"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderActionCards()
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={openFormDialog} onOpenChange={setOpenFormDialog}>
        <DialogContent className="max-h-[95vh] flex flex-col">
          <DialogTitle>
            {currentNodeType && <>Add {currentNodeType.label.toLowerCase()}</>}
          </DialogTitle>
          <DialogDescription>{currentNodeType?.description}</DialogDescription>
          {currentNodeType && (
            <div className="grow overflow-y-auto">
              <DynamicForm
                currentNodeType={currentNodeType}
                isForm={true}
                onSubmit={handleAddNode}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

interface ActionCardProps {
  item: ActionItem
  onSelect: () => void
}

function ActionCard({ item, onSelect }: ActionCardProps) {
  const IconComponent = useIcon(item.icon)

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary border border-transparent hover:shadow-md bg-muted',
        item.disabled && 'opacity-50 cursor-not-allowed',
        'h-full'
      )}
      onClick={item.disabled ? undefined : onSelect}
    >
      <CardContent className="p-2 relative flex flex-col items-center text-center h-full">
        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3 mt-2">
          <IconComponent
            style={{ color: item.color }}
            className={cn('h-12 w-12', item.color ? '' : 'text-primary')}
          />
        </div>
        <div className="font-medium text-sm">{item.label}</div>
        {!item.children && <div className="text-sm mt-2 opacity-60">{item.description}</div>}
        {!item.children && (
          <Badge variant="outline" className="mt-2">
            {item.fields.length} fields
          </Badge>
        )}
        {item.disabled && (
          <Badge variant="outline" className="mt-2 absolute top-2 left-2">
            Soon
          </Badge>
        )}
        {item.children && (
          <div className="absolute top-3 right-4 text-xs text-muted-foreground mt-1">
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
        {item.children && (
          <div className="text-xs text-muted-foreground mt-1">{item.children.length} options</div>
        )}
      </CardContent>
    </Card>
  )
}
