import Dagre from '@dagrejs/dagre'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial
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
  maxRadius?: number
  collisionRadius?: number
  collisionStrength?: number
  centerGravity?: number
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
    rankdir: 'TB',
    ranker: 'tight-tree',
    nodesep: 5,
    ranksep: 5
  })

  const nodeWidth = 15
  const nodeHeight = 15

  nodes.forEach((node) =>
    g.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight
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
      y: nodeWithPosition.y
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
    chargeStrength = -150,
    linkDistance = 35,
    linkStrength = 1.0,
    alphaDecay = 0.06,
    alphaMin = 0.001,
    velocityDecay = 0.75,
    iterations = 300,
    maxRadius,
    collisionRadius = 22,
    collisionStrength = 0.95,
    centerGravity = 0.15
  } = options

  // Create simulation nodes with initial random positions
  const simNodes = nodes.map((node) => ({
    ...node,
    x: node.x ?? Math.random() * width,
    y: node.y ?? Math.random() * height
  }))

  // Create simulation links
  const simLinks = edges.map((edge) => ({
    source: typeof edge.source === 'object' ? edge.source.id : edge.source,
    target: typeof edge.target === 'object' ? edge.target.id : edge.target
  }))

  // Calculate node degrees (number of connections) for adaptive repulsion
  const nodeDegrees = new Map<string, number>()
  simNodes.forEach((node: any) => nodeDegrees.set(node.id, 0))
  simLinks.forEach((link: any) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source
    const targetId = typeof link.target === 'object' ? link.target.id : link.target
    nodeDegrees.set(sourceId, (nodeDegrees.get(sourceId) || 0) + 1)
    nodeDegrees.set(targetId, (nodeDegrees.get(targetId) || 0) + 1)
  })

  // Create D3 force simulation
  const centerX = width / 2
  const centerY = height / 2

  const simulation = forceSimulation(simNodes as any)
    .force(
      'link',
      forceLink(simLinks)
        .id((d: any) => d.id)
        .distance(linkDistance)
        .strength(linkStrength)
    )
    // Adaptive charge: nodes with more connections (cluster hubs) repel more
    .force(
      'charge',
      forceManyBody().strength((node: any) => {
        const degree = nodeDegrees.get(node.id) || 1
        // Scale repulsion by degree: hubs repel 2-3x more than isolated nodes
        const scaleFactor = 1 + Math.log(degree + 1) / Math.log(10)
        return chargeStrength * scaleFactor
      })
    )
    .force('center', forceCenter(centerX, centerY))
    // Add collision force to prevent node overlap
    .force('collide', forceCollide().radius(collisionRadius).strength(collisionStrength))
    // Add radial gravity to pull all nodes toward center
    .force('gravity', (alpha: number) => {
      const strength = centerGravity * alpha
      simNodes.forEach((node: any) => {
        const dx = centerX - node.x
        const dy = centerY - node.y
        node.vx += dx * strength
        node.vy += dy * strength
      })
    })
    .alphaDecay(alphaDecay)
    .alphaMin(alphaMin)
    .velocityDecay(velocityDecay)

  // Run simulation synchronously for specified iterations
  // Send progress updates every 10 iterations
  const progressInterval = Math.max(1, Math.floor(iterations / 10))

  for (let i = 0; i < iterations; i++) {
    simulation.tick()

    // Apply circular boundary constraint if maxRadius is specified
    if (maxRadius !== undefined && maxRadius > 0) {
      simNodes.forEach((node: any) => {
        const dx = node.x - centerX
        const dy = node.y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        // If node is outside the circle, push it back to the edge
        if (distance > maxRadius) {
          const ratio = maxRadius / distance
          node.x = centerX + dx * ratio
          node.y = centerY + dy * ratio
        }
      })
    }

    // Send progress updates
    if (i % progressInterval === 0 || i === iterations - 1) {
      self.postMessage({
        type: 'progress',
        progress: (i + 1) / iterations
      })
    }
  }

  simulation.stop()

  return {
    nodes: simNodes.map((node) => ({
      ...node,
      x: node.x,
      y: node.y
    })),
    edges
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
      result
    })
  } catch (error) {
    // Send error back to the main thread
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})
