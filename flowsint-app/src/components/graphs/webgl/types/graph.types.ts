import type { GraphNode, GraphEdge } from '@/types'
import type { Graphics, Text, Sprite } from 'pixi.js'

/**
 * Simulation node with D3-force properties
 */
export interface SimulationNode extends GraphNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
  neighbors: SimulationNode[]
  links: SimulationLink[]
  nodeColor: string
  nodeSize: number
}

/**
 * Simulation link for D3-force
 */
export interface SimulationLink {
  source: string | SimulationNode
  target: string | SimulationNode
}

/**
 * Edge label rendering objects
 */
export interface EdgeLabelObjects {
  text: Text
  background: Graphics
}

/**
 * Node rendering objects
 */
export interface NodeRenderObjects {
  graphics: Graphics
  label?: Text
  labelBackground?: Graphics
  icon?: Sprite
}

/**
 * Node label rendering objects
 */
export interface NodeLabelObjects {
  text: Text
  background: Graphics
}

/**
 * Highlight state for nodes and links
 */
export interface HighlightState {
  nodes: Set<string>
  links: Set<string>
}

/**
 * Transform state for zoom/pan
 */
export interface TransformState {
  k: number // scale
  x: number // translateX
  y: number // translateY
}

/**
 * Visibility settings
 */
export interface VisibilitySettings {
  showIcons: boolean
  showLabels: boolean
  visibleNodeLabels: Set<string>
}

/**
 * Force settings from store
 */
export interface ForceSettings {
  nodeSize: { value: number }
  linkWidth: { value: number }
  nodeLabelFontSize: { value: number }
}

/**
 * Graph renderer state
 */
export interface GraphRendererState {
  hoveredNodeId: string | null
  isDragging: boolean
  highlightState: HighlightState
  transform: TransformState
  visibilitySettings: VisibilitySettings
}

/**
 * Layout mode for graph
 */
export type LayoutMode = 'none' | 'force' | 'dagre'

/**
 * Props for WebGL Graph Viewer
 */
export interface WebGLGraphViewerProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  className?: string
  style?: React.CSSProperties
  onNodeClick?: (node: GraphNode, event: MouseEvent) => void
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void
  onBackgroundClick?: () => void
  showIcons?: boolean
  showLabels?: boolean
  layoutMode?: LayoutMode
}

/**
 * Graph controls actions
 */
export interface GraphControlActions {
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
}
