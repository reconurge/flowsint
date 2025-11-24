import Dagre from '@dagrejs/dagre'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
} from 'd3-force'

export interface GraphNode {
  id: string
  x?: number
  y?: number
  fx?: number
  fy?: number
  [key: string]: any
}

export interface GraphEdge {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  [key: string]: any
}

interface DagreLayoutOptions {
  direction?: string
  strength?: number
  distance?: number
  iterations?: number
  dagLevelDistance?: number
}

interface ForceLayoutOptions {
  width?: number
  height?: number
  chargeStrength?: number
  linkDistance?: number
  linkStrength?: number
  alphaDecay?: number
  alphaMin?: number
  velocityDecay?: number
  iterations?: number
}

interface LayoutMessage {
  type: 'dagre' | 'force'
  nodes: GraphNode[]
  edges: GraphEdge[]
  options: DagreLayoutOptions | ForceLayoutOptions
}

// Dagre layout computation
function computeDagreLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: DagreLayoutOptions = {}
) {

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  // Configure dagre with proper spacing
  g.setGraph({
    rankdir: "TB",
    ranker: "tight-tree",   // 🔥 plus compact
    nodesep: 20,
    ranksep: 40,
  })

  // Set node dimensions
  const nodeWidth = 10
  const nodeHeight = 20

  nodes.forEach((node) =>
    g.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    })
  )

  edges.forEach((edge) => {
    const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source
    const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target
    g.setEdge(sourceId, targetId)
  })

  Dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      x: nodeWithPosition.x,
      y: nodeWithPosition.y,
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Force layout computation
function computeForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ForceLayoutOptions = {}
) {
  const {
    width = 800,
    height = 600,
    chargeStrength = -30,
    linkDistance = 30,
    linkStrength = 2,
    alphaDecay = 0.045,
    alphaMin = 0,
    velocityDecay = 0.41,
    iterations = 300,
  } = options

  // Create simulation nodes with initial random positions
  const simNodes = nodes.map((node) => ({
    ...node,
    x: node.x ?? Math.random() * width,
    y: node.y ?? Math.random() * height,
  }))

  // Create simulation links
  const simLinks = edges.map((edge) => ({
    source: typeof edge.source === 'object' ? edge.source.id : edge.source,
    target: typeof edge.target === 'object' ? edge.target.id : edge.target,
  }))

  // Create D3 force simulation
  const simulation = forceSimulation(simNodes as any)
    .force(
      'link',
      forceLink(simLinks)
        .id((d: any) => d.id)
        .distance(linkDistance)
        .strength(linkStrength)
    )
    .force('charge', forceManyBody().strength(chargeStrength))
    .force('center', forceCenter(width / 2, height / 2))
    .alphaDecay(alphaDecay)
    .alphaMin(alphaMin)
    .velocityDecay(velocityDecay)

  // Run simulation synchronously for specified iterations
  // Send progress updates every 10 iterations
  const progressInterval = Math.max(1, Math.floor(iterations / 10))

  for (let i = 0; i < iterations; i++) {
    simulation.tick()

    // Send progress updates
    if (i % progressInterval === 0 || i === iterations - 1) {
      self.postMessage({
        type: 'progress',
        progress: (i + 1) / iterations,
      })
    }
  }

  simulation.stop()

  return {
    nodes: simNodes.map((node) => ({
      ...node,
      x: node.x,
      y: node.y,
    })),
    edges,
  }
}

// Listen for messages from the main thread
self.addEventListener('message', (event: MessageEvent<LayoutMessage>) => {
  const { type, nodes, edges, options } = event.data

  try {
    let result

    if (type === 'dagre') {
      result = computeDagreLayout(nodes, edges, options as DagreLayoutOptions)
    } else if (type === 'force') {
      result = computeForceLayout(nodes, edges, options as ForceLayoutOptions)
    } else {
      throw new Error(`Unknown layout type: ${type}`)
    }

    // Send the result back to the main thread
    self.postMessage({
      type: 'complete',
      result,
    })
  } catch (error) {
    // Send error back to the main thread
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
