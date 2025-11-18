import { useCallback, useRef, useEffect } from 'react'
import { GraphNode, GraphEdge } from '@/types'

interface UseLayoutProps {
  forceSettings: any
  containerSize: { width: number; height: number }
  saveAllNodePositions: (nodes: any[], force?: boolean) => void
  onProgress?: (progress: number) => void
}

interface LayoutOptions {
  layoutType: 'force' | 'hierarchy'
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function useLayout({
  forceSettings,
  containerSize,
  saveAllNodePositions,
  onProgress,
}: UseLayoutProps) {
  const workerRef = useRef<Worker | null>(null)

  // Initialize worker once
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/layout.worker.ts', import.meta.url),
      { type: 'module' }
    )

    return () => {
      // Cleanup worker on unmount
      workerRef.current?.terminate()
    }
  }, [])

  const applyLayout = useCallback(
    async ({ layoutType, nodes, edges }: LayoutOptions) => {
      if (!workerRef.current) {
        throw new Error('Layout worker not initialized')
      }

      // Remove fx and fy from all nodes to allow repositioning
      nodes.forEach((node: any) => {
        delete node.fx
        delete node.fy
      })

      return new Promise<GraphNode[]>((resolve, reject) => {
        const worker = workerRef.current!

        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'progress') {
            onProgress?.(event.data.progress)
          } else if (event.data.type === 'complete') {
            const { nodes: layoutedNodes } = event.data.result

            // Apply the calculated positions to the graph nodes
            layoutedNodes.forEach((layoutedNode: any) => {
              const graphNode = nodes.find((n: any) => n.id === layoutedNode.id) as any
              if (graphNode && layoutedNode.x !== undefined && layoutedNode.y !== undefined) {
                graphNode.x = layoutedNode.x
                graphNode.y = layoutedNode.y
                graphNode.fx = layoutedNode.x
                graphNode.fy = layoutedNode.y
              }
            })

            // Save all node positions
            saveAllNodePositions(nodes, true)

            // Cleanup listener
            worker.removeEventListener('message', handleMessage)
            worker.removeEventListener('error', handleError)

            resolve(nodes)
          } else if (event.data.type === 'error') {
            worker.removeEventListener('message', handleMessage)
            worker.removeEventListener('error', handleError)
            reject(new Error(event.data.error))
          }
        }

        const handleError = (error: ErrorEvent) => {
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          reject(error)
        }

        worker.addEventListener('message', handleMessage)
        worker.addEventListener('error', handleError)

        // Send layout task to worker
        if (layoutType === 'hierarchy') {
          worker.postMessage({
            type: 'dagre',
            nodes: nodes.map(n => ({ ...n })), // Clone to avoid reference issues
            edges: edges.map(e => ({ ...e })),
            options: {
              dagLevelDistance: forceSettings.dagLevelDistance?.value ?? 50,
            },
          })
        } else {
          worker.postMessage({
            type: 'force',
            nodes: nodes.map(n => ({ ...n })),
            edges: edges.map(e => ({ ...e })),
            options: {
              width: containerSize.width || 800,
              height: containerSize.height || 600,
              chargeStrength: forceSettings.d3ForceChargeStrength?.value ?? -30,
              linkDistance: forceSettings.d3ForceLinkDistance?.value ?? 30,
              linkStrength: forceSettings.d3ForceLinkStrength?.value ?? 2,
              alphaDecay: forceSettings.d3AlphaDecay?.value ?? 0.045,
              alphaMin: forceSettings.d3AlphaMin?.value ?? 0,
              velocityDecay: forceSettings.d3VelocityDecay?.value ?? 0.41,
              iterations: forceSettings.cooldownTicks?.value ?? 300,
            },
          })
        }
      })
    },
    [forceSettings, containerSize, saveAllNodePositions, onProgress]
  )

  return { applyLayout }
}
