import { GraphNode, GraphEdge } from '@/types'

export interface GraphViewerProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode, event: MouseEvent) => void
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void
  onEdgeRightClick?: (edge: GraphEdge, event: MouseEvent) => void
  onBackgroundClick?: () => void
  onBackgroundRightClick?: (event: MouseEvent) => void
  showLabels?: boolean
  showIcons?: boolean
  backgroundColor?: string
  className?: string
  style?: React.CSSProperties
  onGraphRef?: (ref: any) => void
  instanceId?: string
  allowLasso?: boolean
  sketchId?: string
  allowForces?: boolean
  autoZoomOnNode?: boolean
  showMinimalControls?: boolean
  showMinimap?: boolean
}

export interface TooltipData {
  label: string
  connections: string
  type: string
}

export interface TooltipState {
  x: number
  y: number
  data: TooltipData | null
  visible: boolean
}

export interface TransformedNode extends GraphNode {
  nodeLabel: string
  nodeColor: string
  nodeSize: number
  nodeType: string
  val: number
  neighbors: any[]
  links: any[]
  fx?: number
  fy?: number
}

export interface TransformedEdge extends GraphEdge {
  edgeLabel?: string
  curvature: number
  groupIndex: number
  groupSize: number
}

export interface GraphData {
  nodes: TransformedNode[]
  links: TransformedEdge[]
}
