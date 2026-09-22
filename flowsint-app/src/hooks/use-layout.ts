import { useCallback, useRef, useEffect } from 'react'
import { GraphEdge, GraphNode } from '@/types'
import type { GraphForceSettings } from '@/stores/graph-settings-store'

interface UseLayoutProps {
  forceSettings: GraphForceSettings
  containerSize: { width: number; height: number }
  saveAllNodePositions: (nodes: GraphNode[], force?: boolean) => void
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
  onProgress
}: UseLayoutProps) {
  const workerRef = useRef<Worker | null>(null)

  // Initialize worker once
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/layout.worker.ts', import.meta.url), {
      type: 'module'
    })
    return () => {
      // Cleanup worker on unmount
      workerRef.current?.terminate()
    }
  }, [])

  const applyLayout = useCallback(
    async ({ nodes, edges, layoutType }: LayoutOptions) => {
      if (!workerRef.current) {
        throw new Error('Layout worker not initialized')
      }
      // Remove fx and fy from all nodes to allow repositioning
      nodes.forEach((node) => {
        delete node.fx
        delete node.fy
      })
      return new Promise<GraphNode[]>((resolve, reject) => {
        const worker = workerRef.current!

        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'progress') {
            onProgress?.(event.data.progress)
          } else if (event.data.type === 'complete') {
            // Worker result crosses postMessage's structured-clone boundary —
            // only .id/.x/.y are ever read off it, so that's all it declares.
            const { nodes: layoutedNodes } = event.data.result as {
              nodes: { id: string; x?: number; y?: number }[]
            }
            // // Apply the calculated positions to the graph nodes
            layoutedNodes.forEach((layoutedNode) => {
              const graphNode = nodes.find((n) => n.id === layoutedNode.id)
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
            nodes: nodes.map((n) => ({ ...n })), // Clone to avoid reference issues
            edges: edges.map((e) => ({ ...e })),
            options: {
              dagLevelDistance: forceSettings.dagLevelDistance?.value ?? 50
            }
          })
        } else {
          const width = containerSize.width || 800
          const height = containerSize.height || 600
          // Calculate maxRadius as 40% of the smallest dimension to keep nodes in view
          // const maxRadius = Math.min(width, height) * 500

          worker.postMessage({
            type: 'force',
            nodes: nodes.map((n) => ({ ...n })),
            edges: edges.map((e) => ({ ...e })),
            options: {
              width,
              height,
              chargeStrength: forceSettings.d3ForceChargeStrength?.value ?? -150,
              linkDistance: forceSettings.d3ForceLinkDistance?.value ?? 35,
              linkStrength: forceSettings.d3ForceLinkStrength?.value ?? 1.0,
              alphaDecay: forceSettings.d3AlphaDecay?.value ?? 0.06,
              alphaMin: forceSettings.d3AlphaMin?.value ?? 0.001,
              velocityDecay: forceSettings.d3VelocityDecay?.value ?? 0.75,
              iterations: forceSettings.cooldownTicks?.value ?? 300,
              collisionRadius: forceSettings.collisionRadius?.value ?? 22,
              collisionStrength: forceSettings.collisionStrength?.value ?? 0.95,
              centerGravity: forceSettings.centerGravity?.value ?? 0.15
              // maxRadius,
            }
          })
        }
      })
    },
    [forceSettings, containerSize, saveAllNodePositions, onProgress]
  )

  return { applyLayout }
}
