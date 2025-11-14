/**
 * Public exports for WebGL Graph Viewer
 * Use this file to export types, utilities, and constants that external consumers might need
 */

// Main component
export { default as WebGLGraphViewer } from './index'

// Types
export type {
  WebGLGraphViewerProps,
  SimulationNode,
  SimulationLink,
  GraphControlActions,
  HighlightState,
  TransformState,
  VisibilitySettings,
  ForceSettings,
  NodeLabelObjects,
  EdgeLabelObjects,
  LayoutMode,
} from './types/graph.types'
export type { LabelBoundingBox } from './utils/label-decluttering'

// Constants (if external consumers need them)
export { GRAPH_CONSTANTS } from './constants'

// Utilities (if external consumers need them)
export { textureCache } from './utils/texture-cache'
export {
  calculateVisibleLabels, // @deprecated - Use selectLabelsWithDecluttering instead
  shouldShowEdgeLabels,
  shouldShowNodeIcons,
  shouldShowNodeLabels,
  isHighDetailMode,
  getLODLevel,
  calculateNodeLabelFontSize,
} from './utils/visibility-calculator'
export {
  calculateLabelBoundingBox,
  boundingBoxesOverlap,
  selectLabelsWithDecluttering,
  selectLabelsWithDeclutteringFast,
} from './utils/label-decluttering'
export {
  cssToPixiColor,
  pixiToCssColor,
  getNodeColor,
  getEdgeStyle,
} from './utils/color-utils'

// Hooks (if external consumers want to build custom viewers)
export { usePixiApp } from './hooks/use-pixi-app'
export { useForceSimulation } from './hooks/use-force-simulation'
export { useGraphInteractions } from './hooks/use-graph-interactions'
export { useZoomPan } from './hooks/use-zoom-pan'
export { useGraphRenderer } from './hooks/use-graph-renderer'

// Renderers (if external consumers want to customize rendering)
export {
  renderNode,
  updateIconSprite,
  calculateNodeSize,
} from './renderers/node-renderer'
export { renderEdges, createLinkKey } from './renderers/edge-renderer'
export {
  updateNodeLabel,
  updateEdgeLabel,
  createNodeLabel,
  createEdgeLabel,
} from './renderers/label-renderer'

// Debug components
export { LODIndicator } from './components/lod-indicator'
