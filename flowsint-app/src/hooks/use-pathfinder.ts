import { useCallback, useRef, useEffect } from 'react'
import type { GraphNode, GraphEdge, Path } from '@/types'

export function usePathfinder() {
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/pathfinder.worker.ts', import.meta.url),
      { type: 'module' }
    )
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const findPath = useCallback(
    (nodes: GraphNode[], edges: GraphEdge[], sourceId: string, targetId: string): Promise<Path | null> => {
      if (!workerRef.current) {
        return Promise.reject(new Error('Pathfinder worker not initialized'))
      }

      return new Promise((resolve, reject) => {
        const worker = workerRef.current!

        const handleMessage = (event: MessageEvent) => {
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)

          if (event.data.type === 'complete') {
            resolve(event.data.result)
          } else if (event.data.type === 'error') {
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

        worker.postMessage({
          nodes: nodes.map((n) => ({ id: n.id, nodeLabel: n.nodeLabel, nodeType: n.nodeType })),
          edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, caption: e.caption })),
          sourceId,
          targetId,
        })
      })
    },
    []
  )

  return { findPath }
}
