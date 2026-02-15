type WorkerNode = { id: string; nodeLabel: string; nodeType: string }
type WorkerEdge = { id: string; source: string; target: string; label: string; caption?: string }

interface PathfinderMessage {
  nodes: WorkerNode[]
  edges: WorkerEdge[]
  sourceId: string
  targetId: string
}

function bfs(
  adjacency: Map<string, { nodeId: string; edgeId: string }[]>,
  sourceId: string,
  targetId: string
): string[] | null {
  if (sourceId === targetId) return [sourceId]

  const visited = new Set<string>([sourceId])
  const parent = new Map<string, string>()
  const queue: string[] = [sourceId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = adjacency.get(current)
    if (!neighbors) continue

    for (const { nodeId } of neighbors) {
      if (visited.has(nodeId)) continue
      visited.add(nodeId)
      parent.set(nodeId, current)

      if (nodeId === targetId) {
        // Reconstruct path
        const path: string[] = []
        let node: string | undefined = targetId
        while (node !== undefined) {
          path.unshift(node)
          node = parent.get(node)
        }
        return path
      }

      queue.push(nodeId)
    }
  }

  return null
}

self.onmessage = (event: MessageEvent<PathfinderMessage>) => {
  try {
    const { nodes, edges, sourceId, targetId } = event.data

    // Build adjacency list (undirected)
    const adjacency = new Map<string, { nodeId: string; edgeId: string }[]>()
    for (const node of nodes) {
      adjacency.set(node.id, [])
    }
    for (const edge of edges) {
      adjacency.get(edge.source)?.push({ nodeId: edge.target, edgeId: edge.id })
      adjacency.get(edge.target)?.push({ nodeId: edge.source, edgeId: edge.id })
    }

    const pathIds = bfs(adjacency, sourceId, targetId)

    if (!pathIds) {
      self.postMessage({ type: 'complete', result: null })
      return
    }

    // Build node map for quick lookup
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // Collect path nodes
    const pathNodes = pathIds.map((id) => {
      const n = nodeMap.get(id)!
      return { id: n.id, label: n.nodeLabel, node_type: n.nodeType }
    })

    // Collect path edges (edges between consecutive path nodes)
    const pathEdges: { id: string; source: string; target: string; label: string; caption?: string }[] = []

    for (let i = 0; i < pathIds.length - 1; i++) {
      const a = pathIds[i]
      const b = pathIds[i + 1]
      // Find the edge connecting a and b
      const edge = edges.find(
        (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a)
      )
      if (edge) {
        pathEdges.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          caption: edge.caption,
        })
      }
    }

    self.postMessage({
      type: 'complete',
      result: {
        ids: pathIds,
        nodes: pathNodes,
        edges: pathEdges,
      },
    })
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
