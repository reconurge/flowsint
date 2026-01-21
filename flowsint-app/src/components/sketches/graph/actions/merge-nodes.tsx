import { useEffect, useState } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Info, Merge, MinusCircleIcon, PlusCircleIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { GraphNode } from '@/types'
import { NodeDisplayCard } from '../../create-relation'
import { RadioGroup } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn, deepObjectDiff } from '@/lib/utils'
import { sketchService } from '@/api/sketch-service'
import { useParams } from '@tanstack/react-router'

export function MergeDialog() {
  const { id: sketchId } = useParams({ strict: false })
  const selectedNodes = useGraphStore((state) => state.selectedNodes || [])
  const openMergeDialog = useGraphStore((state) => state.openMergeDialog)
  const setOpenMergeDialog = useGraphStore((state) => state.setOpenMergeDialog)
  const [priorityIndex, setPriorityIndex] = useState(0)
  const [preview, setPreview] = useState<GraphNode | null>(null)
  const [old, setOld] = useState<GraphNode | null>(null)

  useEffect(() => {
    if (selectedNodes.length === 0) return
    const priorityEntity = selectedNodes[priorityIndex]
    if (!priorityEntity) return
    const otherEntitiesToMerge = selectedNodes.filter((node) => node?.id != priorityEntity?.id)
    const old = {
      ...otherEntitiesToMerge.reduce(
        (acc, entity) => ({
          ...acc,
          ...entity
        }),
        {} as GraphNode
      )
    }
    const merge = {
      ...old,
      ...priorityEntity
    }
    setOld(old)
    setPreview(merge)
  }, [selectedNodes, priorityIndex, setPreview])

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!preview) return toast.error('No preview available.')
    if (!selectedNodes.every((n) => n.nodeType === selectedNodes[0].nodeType))
      return toast.error('Cannot merge entities of different types.')
    const entitiesToMerge = selectedNodes.map((node) => node.id)
    // Extract only id and data to avoid circular references from neighbors/links
    const body = JSON.stringify({
      oldNodes: entitiesToMerge,
      newNode: {
        id: preview.id,
        data: preview.data
      }
    })
    return toast.promise(
      (async () => {
        await sketchService.mergeNodes(sketchId as string, body)
        setOpenMergeDialog(false)
      })(),
      {
        loading: 'Merging entities...',
        success: 'Entities successfully merged.',
        error: (error) => {
          console.log(error)
          return 'Unexpected error during merging.'
        }
      }
    )
  }

  return (
    <Dialog open={openMergeDialog} onOpenChange={setOpenMergeDialog}>
      <DialogContent className="w-full! max-w-[700px]! max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-4 w-4" />
            Merging {selectedNodes.length} entities
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 w-full overflow-hidden">
          {/* Selected Nodes Display */}
          <div className="space-y-2 w-full">
            <Alert className="">
              <Info />
              <AlertTitle>Heads up!</AlertTitle>
              <AlertDescription>
                When merging, you can choose which entity is prioritary, simply click it in the list
                below. Also keep in mind:
                <div>
                  <ul className="ml-2 !list-disc">
                    <li>
                      All <span className="font-semibold">attributes</span> will be merged, and the
                      matching ones values will be based on the prioritary entity
                    </li>
                    <li>
                      Only one node will be kept, and all{' '}
                      <span className="font-semibold">relationships</span> will be merged
                    </li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Selected Nodes ({selectedNodes.length})
            </Label>
            <RadioGroup
              className="flex overflow-x-auto w-full gap-2"
              value={String(priorityIndex)}
              onValueChange={(value) => setPriorityIndex(parseInt(value, 10))}
            >
              {selectedNodes.map((node, index) => (
                <NodeDisplayCard
                  key={node.id}
                  id={`priority-${node.id}`}
                  node={node}
                  asRadio
                  radioValue={String(index)}
                />
              ))}
            </RadioGroup>
          </div>
          {preview && old && (
            <div className="space-y-2 text-sm">
              <p>Merged attributes</p>
              <div className="rounded-md border overflow-hidden">
                <KeyValueDisplayDiff
                  oldRecord={old.nodeProperties}
                  newRecord={preview.nodeProperties}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenMergeDialog(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Merge ({selectedNodes.length})
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface KeyValueDisplayDiffProps {
  oldRecord: Record<string, any>
  newRecord: Record<string, any>
}
function KeyValueDisplayDiff({ oldRecord, newRecord }: KeyValueDisplayDiffProps) {
  const diffObject = deepObjectDiff(oldRecord, newRecord)
  return (
    <div className={'w-full border-collapse divide-y divide-border'}>
      {diffObject &&
        Object.entries(diffObject)
          .filter(
            ([key]) => !['sketch_id', 'caption', 'size', 'color', 'description'].includes(key)
          )
          .map(([key, value], index) => {
            const isNewKey = value.new
            const hasChanged = !value.identical
            const isOldKey = value.removed
            return (
              <div
                key={index}
                className={cn(
                  'flex w-full bg-card items-center divide-x divide-border p-0',
                  hasChanged && 'bg-orange-300/10',
                  isNewKey && 'bg-green-400/10',
                  isOldKey && 'bg-red-400/10'
                )}
              >
                <div
                  className={cn(
                    'w-1/2 px-4 p-2 text-sm text-muted-foreground flex items-center gap-1 font-normal truncate'
                  )}
                >
                  {isNewKey && <PlusCircleIcon className="h-4 w-4 text-green-400" />}
                  {isOldKey && <MinusCircleIcon className="h-4 w-4 text-red-400" />}
                  <span
                    className={cn(
                      hasChanged && 'text-orange-300',
                      isNewKey && 'text-green-400',
                      isOldKey && 'text-red-400'
                    )}
                  >
                    {key}
                  </span>
                </div>
                <div className="w-1/2 px-4 p-2 text-sm font-medium flex items-center justify-between min-w-0">
                  {!hasChanged ? (
                    <div className="truncate font-normal">{JSON.stringify(value.value ?? '')}</div>
                  ) : (
                    <div className="truncate flex flex-wrap gap-2 font-semibold">
                      <span className="line-through text-red-300">
                        {JSON.stringify(value.oldValue)}
                      </span>
                      <span className={cn(isOldKey ? 'text-red-500' : 'text-green-500')}>
                        {JSON.stringify(value.newValue ?? '')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
    </div>
  )
}
