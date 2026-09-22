import { GraphNode, GraphEdge, type GraphViewerRef } from '@/types'

export interface GraphViewerProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode, event: MouseEvent) => void
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void
  onEdgeRightClick?: (edge: GraphEdge, event: MouseEvent) => void
  onBackgroundClick?: (event?: MouseEvent) => void
  onBackgroundRightClick?: (event: MouseEvent) => void
  showLabels?: boolean
  showIcons?: boolean
  backgroundColor?: string
  className?: string
  style?: React.CSSProperties
  onGraphRef?: (ref: GraphViewerRef) => void
  instanceId?: string
  allowLasso?: boolean
  sketchId?: string
  allowForces?: boolean
  autoZoomOnNode?: boolean
  showMinimalControls?: boolean
  showMinimap?: boolean
  enableNodeDrag?: boolean
  linkCreation?: {
    shiftHeld: boolean
    sourceNode: GraphNode | null
    onStartLinking: (node: GraphNode) => void
    onCompleteLinking: (node: GraphNode, screenX: number, screenY: number) => void
    onCancel: () => void
  }
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
  // Required here (vs optional on GraphNode): transformGraphData always
  // populates both before a node becomes a TransformedNode.
  neighbors: NonNullable<GraphNode['neighbors']>
  links: NonNullable<GraphNode['links']>
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
