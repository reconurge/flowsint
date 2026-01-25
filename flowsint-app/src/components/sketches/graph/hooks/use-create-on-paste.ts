import { usePasteListener } from '@/hooks/use-paste-listener'
import { useGraphStore } from '@/stores/graph-store'
import { type GraphNode, NodeProperties } from '@/types/graph'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { useCallback } from 'react'
import { sketchService } from '@/api/sketch-service'

export function useCreateOnPaste(sketchId: string) {
  const addNode = useGraphStore((s) => s.addNode)
  const replaceNode = useGraphStore((s) => s.replaceNode)

  const onText = useCallback(
    async (text: string) => {
      try {
        const nodeWithTempId: GraphNode = {
          id: uuidv4(),
          nodeType: 'phrase', // Required at root level for API validation
          nodeLabel: text,
          x: 100, // Position at viewport center
          y: 100,
          nodeSize: 4,
          nodeColor: null,
          nodeShape: 'circle',
          nodeFlag: null,
          nodeIcon: null,
          nodeImage: null,
          nodeProperties: {
            text: text
          },
          nodeMetadata: {}
        }

        await createNode(nodeWithTempId, sketchId, addNode, replaceNode)
      } catch (e) {
        toast.error(e.message)
      }
    },
    [sketchId]
  )

  const onImage = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file)
      try {
        const title = file.name
        const nodeWithTempId: GraphNode = {
          id: uuidv4(),
          nodeType: 'document', // Required at root level for API validation
          nodeLabel: title,
          x: Math.floor(Math.random() * 1000), // Position at viewport center
          y: Math.floor(Math.random() * 1000),
          nodeSize: 30,
          nodeColor: null,
          nodeFlag: null,
          nodeIcon: null,
          nodeImage: url || 'https://upload.wikimedia.org/wikipedia/en/d/dc/MichaelScott.png',
          nodeShape: 'square',
          nodeProperties: {
            title: title
          },
          nodeMetadata: {}
        }
        await createNode(nodeWithTempId, sketchId, addNode, replaceNode)
      } catch (e) {
        toast.error(e.message)
      }
    },
    [sketchId]
  )
  return usePasteListener(
    {
      text: onText,
      image: onImage
    },
    { global: true, preventDefault: true }
  )
}

const createNode = async (
  node: GraphNode,
  sketchId: string,
  addNode: (node: GraphNode) => void,
  replaceNode: (oldId: string, newId: string, nodeProperties: NodeProperties) => void
) => {
  try {
    addNode(node)
    // Create the node via API to get the real database ID
    const newNodeResponse = await sketchService.addNode(sketchId, JSON.stringify(node))
    const newNode: GraphNode = newNodeResponse.node
    if (newNode) {
      replaceNode(node.id, newNode.id, newNode.nodeProperties)
    }
  } catch (e) {
    toast.error('Could not create node.')
  }
}
