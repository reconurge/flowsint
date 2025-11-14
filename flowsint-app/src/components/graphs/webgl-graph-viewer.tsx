/**
 * WebGL Graph Viewer - Legacy Entry Point
 * This file is kept for backward compatibility.
 * The actual implementation has been refactored into a modular architecture.
 * @see ./webgl/ for the new modular implementation
 */
import React from 'react'
import type { GraphNode, GraphEdge } from '@/types'
import WebGLGraphViewer from './webgl'

/**
 * @deprecated Use the new modular implementation from './webgl' directly
 */
interface WebGLGraphViewerProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  className?: string
  style?: React.CSSProperties
  onNodeClick?: (node: GraphNode, event: MouseEvent) => void
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void
  onBackgroundClick?: () => void
  showIcons?: boolean
  showLabels?: boolean
  layoutMode?: 'none' | 'force' | 'dagre'
}

/**
 * WebGL Graph Viewer Component
 * High-performance graph visualization using WebGL (Pixi.js) and D3-force
 *
 * @deprecated This is a legacy wrapper. Import from './webgl' for the new modular version.
 */
const WebGLGraphViewerLegacy: React.FC<WebGLGraphViewerProps> = (props) => {
  return <WebGLGraphViewer {...props} />
}

export default WebGLGraphViewerLegacy
