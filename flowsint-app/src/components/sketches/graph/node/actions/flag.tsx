import { useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Flag } from 'lucide-react'
import { useGraphStore } from '@/stores/graph-store'
import { cn } from '@/lib/utils'
import { sketchService } from '@/api/sketch-service'
import { GraphNode } from '@/types'

const flagColors = {
  red: 'text-red-400 fill-red-200',
  orange: 'text-orange-400 fill-orange-200',
  blue: 'text-blue-400 fill-blue-200',
  green: 'text-green-400 fill-green-200',
  yellow: 'text-yellow-400 fill-yellow-200'
} as const

type flagColor = keyof typeof flagColors

export function NodeFlag({ sketchId, node }: { sketchId: string; node: GraphNode }) {
  const updateNode = useGraphStore((s) => s.updateNode)
  const nodeId = node.id
  const [flagValue, setFlagValue] = useState<flagColor | null>(node.nodeFlag)

  // Synchronize local state when props change (new node selected)
  useEffect(() => {
    setFlagValue(node.nodeFlag)
  }, [nodeId, node.nodeFlag])

  const handleUpdateFlag = useCallback(
    async (value: string) => {
      // Click the same color and it removes it
      const val = value === flagValue ? null : (value as flagColor)
      node.nodeFlag = flagValue
      setFlagValue(val)
      try {
        updateNode(nodeId, { nodeFlag: val })
        const body = JSON.stringify({
          nodeId: node.id,
          updates: { nodeFlag: val } as Partial<GraphNode>
        })
        await sketchService.updateNode(sketchId, body)
      } catch (e) {
        console.log(e)
        // toast.error(e.message)
      }
    },
    [nodeId, flagValue, updateNode]
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100"
          >
            <Flag
              className={cn(flagValue && flagColors[flagValue], 'h-3.5! w-3.5! opacity-70')}
              strokeWidth={2}
            />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-background" side="top" align="center">
        <DropdownMenuRadioGroup
          className="flex gap-1"
          value={flagValue || undefined}
          onValueChange={handleUpdateFlag}
        >
          {(Object.keys(flagColors) as flagColor[]).map((key) => (
            <DropdownMenuRadioItem
              onClick={(e) => e.stopPropagation()}
              className="w-7 flex items-center justify-center gap-1"
              value={key}
            >
              <Flag className={flagColors[key]} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
