import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Dagre from '@dagrejs/dagre'
import { GraphEdge, GraphNode } from '@/types'
import { FlowEdge, FlowNode } from '@/stores/flow-store'
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface LayoutOptions {
  direction?: 'LR' | 'TB'
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

// dagre layout function for the main graph component.
export const getDagreLayoutedElements = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions = {
    direction: 'TB',
    strength: -300,
    distance: 10,
    iterations: 300,
    dagLevelDistance: 50
  }
) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  // Use dagLevelDistance for both node and rank separation
  const levelDistance = options.dagLevelDistance ?? 50

  // Configure dagre with proper spacing
  g.setGraph({
    rankdir: options.direction,
    nodesep: levelDistance, // Horizontal spacing between nodes (fixed distance)
    ranksep: levelDistance, // Vertical spacing between ranks (fixed distance)
    marginx: 10,
    marginy: 10
  })

  // Set node dimensions first - use a consistent size for all nodes
  const nodeWidth = 50
  const nodeHeight = 50

  nodes.forEach((node) =>
    g.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight
    })
  )

  // Then add edges
  // Note: react-force-graph transforms edges so source/target become node objects
  // We need to extract the IDs for Dagre
  edges.forEach((edge: GraphEdge | any) => {
    const source = typeof edge.source === 'object' ? edge.source.id : edge.source
    const target = typeof edge.target === 'object' ? edge.target.id : edge.target
    g.setEdge(source, target)
  })

  Dagre.layout(g)

  return {
    nodes: nodes.map((node) => {
      const position = g.node(node.id)
      const x = position.x
      const y = position.y
      return { ...node, x, y }
    }),
    edges
  }
}

// force layout function for the main graph component
export const getForceLayoutedElements = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ForceLayoutOptions = {
    width: 800,
    height: 600,
    chargeStrength: -30,
    linkDistance: 30,
    linkStrength: 2,
    alphaDecay: 0.045,
    alphaMin: 0,
    velocityDecay: 0.41,
    iterations: 300
  }
) => {
  const {
    width = 800,
    height = 600,
    chargeStrength = -30,
    linkDistance = 30,
    linkStrength = 2,
    alphaDecay = 0.045,
    alphaMin = 0,
    velocityDecay = 0.41,
    iterations = 300
  } = options

  // Create simulation nodes with initial random positions
  const simNodes = nodes.map((node) => ({
    ...node,
    x: node.x ?? Math.random() * width,
    y: node.y ?? Math.random() * height
  }))

  // Create simulation links
  const simLinks = edges.map((edge) => ({
    // @ts-ignore
    source: typeof edge.source === 'object' ? edge.source.id : edge.source,
    // @ts-ignore
    target: typeof edge.target === 'object' ? edge.target.id : edge.target
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
  for (let i = 0; i < iterations; i++) {
    simulation.tick()
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

// dagre layout function for the flow component.
export const getFlowDagreLayoutedElements = (
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: LayoutOptions = {
    direction: 'TB',
    strength: -300,
    distance: 10,
    iterations: 300
  }
) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: options.direction })
  edges.forEach((edge) => g.setEdge(edge.source, edge.target))
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      width: node.measured?.width ?? 0,
      height: node.measured?.height ?? 0
    })
  )
  Dagre.layout(g)
  return {
    nodes: nodes.map((node) => {
      const position = g.node(node.id)
      const x = position.x - (node.measured?.width ?? 0) / 2
      const y = position.y - (node.measured?.height ?? 0) / 2
      return { ...node, position: { x, y } }
    }),
    edges
  }
}

export const sanitize = (name: string) => {
  return name
    .normalize('NFKD') // Decompose special characters (e.g., accents)
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace invalid characters with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with a single one
    .replace(/^_|_$/g, '') // Trim leading or trailing underscores
    .toLowerCase() // Convert to lowercase for consistency
}

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(1) + ' MB'
}

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

export const flattenObj = (ob: Record<string, any>) => {
  let result: Record<string, any> = {}
  for (const i in ob) {
    if (ob[i] && typeof ob[i] === 'object' && !Array.isArray(ob[i])) {
      const temp = flattenObj(ob[i])
      for (const j in temp) {
        result[i + '.' + j] = temp[j]
      }
    } else {
      result[i] = ob[i]
    }
  }
  return result
}

interface FlattenableNode {
  [key: string]: unknown
  children?: FlattenableNode[]
}

export function flattenArray<T extends FlattenableNode>(
  nodes: T[],
  key: string
): Omit<T, typeof key>[] {
  let result: Omit<T, typeof key>[] = []

  for (const node of nodes) {
    const { [key]: children, ...rest } = node
    result.push(rest as Omit<T, typeof key>)
    if (children) {
      result = result.concat(flattenArray(children as T[], key))
    }
  }
  return result
}

export function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const getAllNodeTypes = (actionItems: any[]) => {
  const types: string[] = []
  actionItems.forEach((item) => {
    if (item.children) {
      item.children.forEach((child: GraphNode) => {
        if (child.data.type && !types.includes(child.data.type)) {
          types.push(child.data.type)
        }
      })
    } else if (item.type && !types.includes(item.type)) {
      types.push(item.type)
    }
  })
  return types.sort()
}

export const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

interface Dictionary {
  [Key: string]: any
}

export function deepObjectDiff(obj1: Dictionary, obj2: Dictionary): Dictionary {
  let diffObject = {}
  // We want object 2 to be compared against object 1
  if (typeof obj1 != 'object' || typeof obj2 != 'object')
    throw Error('Items to compare mustr be objects.')
  // We map over the obj2 key:value duos to retrieve new keys that obj2 might have
  Object.entries(obj2).forEach(([key, value]) => {
    // We check for additional keys
    if (!obj1.hasOwnProperty(key)) diffObject = { ...diffObject, [key]: { value, new: true } }
    else {
      diffObject = {
        ...diffObject,
        [key]: {
          value,
          new: false,
          oldValue: obj1[key] ?? null,
          newValue: obj2[key] ?? null,
          identical: obj2[key] === obj1[key]
        }
      }
    }
  })
  // We map over the obj1 key:value duos to retrieve keys that might have disapeared
  Object.entries(obj1).forEach(([key, value]) => {
    // We check for additional keys
    if (!obj2.hasOwnProperty(key)) diffObject = { ...diffObject, [key]: { value, removed: true } }
  })
  return diffObject
}
