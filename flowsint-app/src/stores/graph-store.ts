import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GraphNode, GraphEdge, NodeProperties } from '@/types'
import { type ActionItem } from '@/lib/action-items'
import { Filters, TypeFilter } from '@/types/filter'

interface GraphState {
  // === Graph ===
  nodes: GraphNode[]
  edges: GraphEdge[]
  filteredNodes: GraphNode[]
  filteredEdges: GraphEdge[]
  nodesMapping: Map<string, GraphNode>
  edgesMapping: Map<string, GraphEdge>
  setNodes: (nodes: GraphNode[]) => void
  setEdges: (edges: GraphEdge[]) => void
  addNode: (newNode: Partial<GraphNode>) => GraphNode
  addEdge: (newEdge: Partial<GraphEdge>) => GraphEdge
  removeNodes: (nodeIds: string[]) => void
  removeEdges: (edgeIds: string[]) => void
  updateGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => void
  updateEdge: (edgeId: string, updates: Partial<GraphEdge>) => void
  replaceNode: (oldId: string, newId: string, newProperties: NodeProperties) => void
  reset: () => void

  // === Selection & Current ===
  currentNodeId: GraphNode['id'] | null
  currentEdgeId: GraphEdge['id'] | null
  selectedNodes: GraphNode[]
  selectedEdges: GraphEdge[]
  getNode: (nodeId: GraphNode['id']) => GraphNode | null
  getCurrentNode: () => GraphNode | null | undefined
  getCurrentEdge: () => GraphEdge | null | undefined
  setCurrentNodeId: (nodeId: GraphNode['id'] | null) => void
  setCurrentEdgeId: (edgeId: GraphEdge['id'] | null) => void
  setSelectedNodes: (nodes: GraphNode[]) => void
  setSelectedEdges: (edges: GraphEdge[]) => void
  clearSelectedNodes: () => void
  clearSelectedEdges: () => void
  toggleNodeSelection: (node: GraphNode, multiSelect?: boolean) => void
  toggleEdgeSelection: (edge: GraphEdge, multiSelect?: boolean) => void

  // === Relation ===
  relatedNodeToAdd: GraphNode | null
  setRelatedNodeToAdd: (node: GraphNode | null) => void

  // === Dialogs ===
  openMainDialog: boolean
  openFormDialog: boolean
  openAddRelationDialog: boolean
  openMergeDialog: boolean
  openNodeEditorModal: boolean
  setOpenMainDialog: (open: boolean) => void
  setOpenFormDialog: (open: boolean) => void
  setOpenAddRelationDialog: (open: boolean) => void
  setOpenMergeDialog: (open: boolean) => void
  setOpenNodeEditorModal: (open: boolean) => void

  // === Action Type for Form ===
  currentNodeType: ActionItem | null
  setCurrentNodeType: (nodeType: ActionItem | null) => void
  setCurrentNodeFromId: (nodeId: string) => GraphNode | null
  handleOpenFormModal: (selectedItem: ActionItem | undefined) => void

  // === Action Type for Edit form ===
  handleEdit: (node: GraphNode) => void

  // === Filters ===
  filters: Filters
  setFilters: (filters: Filters) => void
  toggleTypeFilter: (filter: TypeFilter) => void

  // === Utils ===
  nodesLength: number
  edgesLength: number
  getNodesLength: () => number
  getEdgesLength: () => number
}

// --- Helpers ---
const computeFilteredNodes = (nodes: GraphNode[], filters: Filters): GraphNode[] => {
  // types
  const areAllToggled = filters.types.every((t) => t.checked)
  const areNoneToggled = filters.types.every((t) => !t.checked)
  if (areNoneToggled || areAllToggled) return nodes
  const types = filters.types.filter((t) => !t.checked).map((t) => t.type)
  return nodes.filter((node) => !types.includes(node.nodeType))
}

const computeFilteredEdges = (edges: GraphEdge[], filteredNodes: GraphNode[]): GraphEdge[] => {
  const nodeIds = new Set(filteredNodes.map((n) => n.id))
  return edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
}

// --- Store ---
export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      // === Graph ===
      nodes: [],
      edges: [],
      filteredNodes: [],
      filteredEdges: [],
      nodesMapping: new Map(),
      edgesMapping: new Map(),
      getNodesLength: () => get().nodes.length,
      getEdgesLength: () => get().edges.length,

      setNodes: (nodes) => {
        const { filters, edges } = get()
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        // update HashMap
        const nodesMapping = new Map(nodes.map((node) => [node.id, node]))
        set({ nodes, filteredNodes, filteredEdges, nodesMapping })
      },
      setEdges: (edges) => {
        const { filters, nodes } = get()
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        const edgesMapping = new Map(edges.map((edge) => [edge.id, edge]))
        set({ edges, filteredNodes, filteredEdges, edgesMapping })
      },

      addNode: (newNode) => {
        const { nodes, nodesMapping, edges, filters } = get()
        const nodeWithId: GraphNode = {
          id: newNode.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          position: { x: 0, y: 0 },
          ...newNode
        } as GraphNode
        nodes.push(nodeWithId)
        nodesMapping.set(nodeWithId.id, nodeWithId)
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        set({
          nodes,
          currentNodeId: nodeWithId.id,
          filteredNodes,
          filteredEdges
        })
        return nodeWithId
      },

      addEdge: (newEdge) => {
        const { edges, edgesMapping, nodes, filters } = get()
        const edgeWithId: GraphEdge = {
          id: newEdge.id || `edge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          ...newEdge
        } as GraphEdge
        edges.push(edgeWithId)
        edgesMapping.set(edgeWithId.id, edgeWithId)
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        set({ edges, filteredNodes, filteredEdges, edgesMapping })
        return edgeWithId
      },

      removeNodes: (nodeIds: string[]) => {
        const { nodes, nodesMapping, edges, filters } = get()

        const nodeIdsSet = new Set(nodeIds)
        const newNodes = nodes.filter((n) => !nodeIdsSet.has(n.id))
        const newEdges = edges.filter((e) => !nodeIdsSet.has(e.source) && !nodeIdsSet.has(e.target))

        const filteredNodes = computeFilteredNodes(newNodes, filters)
        const filteredEdges = computeFilteredEdges(newEdges, filteredNodes)
        // update HashMap
        deleteKeys(nodesMapping, nodeIdsSet)
        set({ nodes: newNodes, edges: newEdges, filteredNodes, filteredEdges })
      },

      removeEdges: (edgeIds: string[]) => {
        const { edges, edgesMapping, nodes, filters } = get()
        const edgeIdsSet = new Set(edgeIds)
        const newEdges = edges.filter((e) => !edgeIdsSet.has(e.id))
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(newEdges, filteredNodes)
        deleteKeys(edgesMapping, edgeIdsSet)
        set({ edges: newEdges, filteredNodes, filteredEdges, edgesMapping })
      },

      updateGraphData: (nodes, edges) => {
        const { filters } = get()
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        const nodesMapping = new Map(nodes.map((node) => [node.id, node]))
        const edgesMapping = new Map(edges.map((edge) => [edge.id, edge]))
        set({ nodes, edges, filteredNodes, filteredEdges, nodesMapping, edgesMapping })
      },

      updateNode: (nodeId: string, updates: Partial<GraphNode>) => {
        const { nodes, edges, filters, nodesMapping } = get()

        const updatedNodes = nodes.map((node) =>
          node.id === nodeId ? { ...node, ...updates } : node
        )

        const filteredNodes = computeFilteredNodes(updatedNodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)

        const newNodesMapping = new Map(nodesMapping)
        const node = newNodesMapping.get(nodeId)

        if (node) {
          newNodesMapping.set(nodeId, {
            ...node,
            ...updates
          })
        }

        set({
          nodes: updatedNodes,
          filteredNodes,
          filteredEdges,
          nodesMapping: newNodesMapping
        })
      },

      updateEdge: (edgeId, updates) => {
        const { edges, edgesMapping, nodes, filters } = get()
        const updatedEdges = edges.map((edge) =>
          edge.id === edgeId ? ({ ...edge, ...updates } as GraphEdge) : edge
        )
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(updatedEdges, filteredNodes)
        const edge = edgesMapping.get(edgeId)
        if (edge) edgesMapping.set(edgeId, { ...edge, ...updates } as GraphEdge)
        set({ edges: updatedEdges, filteredNodes, filteredEdges, edgesMapping })
      },

      replaceNode: (oldId, newId, nodeProperties) => {
        const { nodes, edges, filters, nodesMapping, setCurrentNodeId } = get()
        // Update the node's ID and data.id
        const updatedNodes = nodes.map((node) =>
          node.id === oldId ? { ...node, id: newId, nodeProperties: nodeProperties } : node
        )
        // Update all edges that reference this node
        const updatedEdges = edges.map((edge) => {
          if (edge.source === oldId) {
            return { ...edge, source: newId }
          }
          if (edge.target === oldId) {
            return { ...edge, target: newId }
          }
          return edge
        })
        const filteredNodes = computeFilteredNodes(updatedNodes, filters)
        const filteredEdges = computeFilteredEdges(updatedEdges, filteredNodes)
        // Update nodesMapping
        nodesMapping.delete(oldId)
        const newNode = updatedNodes.find((n) => n.id === newId)
        if (newNode) nodesMapping.set(newId, newNode)
        // Update edgesMapping
        const newEdgesMapping = new Map(updatedEdges.map((edge) => [edge.id, edge]))
        setCurrentNodeId(newId)
        set({
          nodes: updatedNodes,
          edges: updatedEdges,
          filteredNodes,
          filteredEdges,
          nodesMapping,
          edgesMapping: newEdgesMapping
        })
      },

      // === Selection & Current ===
      currentNodeId: null,
      currentEdgeId: null,
      selectedNodes: [],
      selectedEdges: [],
      getNode: (nodeId: GraphNode['id']) => {
        return get().nodesMapping.get(nodeId) || null
      },
      getCurrentNode: () => {
        const { currentNodeId, nodesMapping } = get()
        return currentNodeId ? nodesMapping.get(currentNodeId) : null
      },
      getCurrentEdge: () => {
        const { currentEdgeId, edgesMapping } = get()
        return currentEdgeId ? edgesMapping.get(currentEdgeId) : null
      },
      setCurrentNodeId: (nodeId: GraphNode['id'] | null) => {
        set({ currentNodeId: nodeId })
      },
      setCurrentEdgeId: (edgeId: GraphEdge['id'] | null) => {
        set({ currentEdgeId: edgeId })
      },
      setCurrentNodeFromId: (nodeId: string) => {
        const { nodesMapping } = get()
        const node = nodesMapping.get(nodeId)
        if (node) {
          set({ currentNodeId: nodeId })
          return node
        }
        return null
      },
      setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
      setSelectedEdges: (edges) => set({ selectedEdges: edges }),
      clearSelectedNodes: () => set({ selectedNodes: [] }),
      clearSelectedEdges: () => set({ selectedEdges: [] }),
      toggleNodeSelection: (node, multiSelect = false) => {
        const { selectedNodes, currentNodeId } = get()
        const isSelected = selectedNodes.some((n) => n.id === node.id)
        let newSelected: GraphNode[]
        let newCurrentNodeId = currentNodeId

        if (multiSelect) {
          newSelected = isSelected
            ? selectedNodes.filter((n) => n.id !== node.id)
            : [...selectedNodes, node]
        } else {
          newSelected = isSelected && selectedNodes.length === 1 ? [] : [node]
          // Only update currentNodeId if it's actually different
          if (!multiSelect) {
            newCurrentNodeId = isSelected ? null : node.id
          }
        }

        // Only update if there are actual changes
        const hasSelectionChanges =
          newSelected.length !== selectedNodes.length ||
          newSelected.some((n, i) => n.id !== selectedNodes[i]?.id)
        const hasCurrentNodeChanges = newCurrentNodeId !== currentNodeId

        if (hasSelectionChanges || hasCurrentNodeChanges) {
          set({
            selectedNodes: newSelected,
            currentNodeId: newCurrentNodeId
          })
        }
      },
      toggleEdgeSelection: (edge, multiSelect = false) => {
        const { selectedEdges } = get()
        const isSelected = selectedEdges.some((e) => e.id === edge.id)
        let newSelected: GraphEdge[]

        if (multiSelect) {
          newSelected = isSelected
            ? selectedEdges.filter((e) => e.id !== edge.id)
            : [...selectedEdges, edge]
        } else {
          newSelected = isSelected && selectedEdges.length === 1 ? [] : [edge]
        }

        // Only update if there are actual changes
        const hasSelectionChanges =
          newSelected.length !== selectedEdges.length ||
          newSelected.some((e, i) => e.id !== selectedEdges[i]?.id)

        if (hasSelectionChanges) {
          set({ selectedEdges: newSelected })
        }
      },

      // === Relation ===
      relatedNodeToAdd: null,
      setRelatedNodeToAdd: (node) => set({ relatedNodeToAdd: node }),

      // === Dialogs ===
      openMainDialog: false,
      openFormDialog: false,
      openAddRelationDialog: false,
      openMergeDialog: false,
      openNodeEditorModal: false,
      setOpenMainDialog: (open) => set({ openMainDialog: open }),
      setOpenFormDialog: (open) => set({ openFormDialog: open }),
      setOpenAddRelationDialog: (open) => set({ openAddRelationDialog: open }),
      setOpenMergeDialog: (open) => set({ openMergeDialog: open }),
      setOpenNodeEditorModal: (open) => set({ openNodeEditorModal: open }),

      // === Action Type for Edit form ===
      handleEdit: (node) => {
        const { currentNodeId, openNodeEditorModal } = get()
        // Only update if the node is actually different
        if (currentNodeId !== node.id) {
          set({ currentNodeId: node.id, openNodeEditorModal: true })
        } else if (!openNodeEditorModal) {
          // Only open modal if it's not already open
          set({ openNodeEditorModal: true })
        }
      },

      // === Action Type for Form ===
      currentNodeType: null,
      setCurrentNodeType: (nodeType) => set({ currentNodeType: nodeType }),
      handleOpenFormModal: (selectedItem) => {
        if (!selectedItem) return
        set({
          currentNodeType: selectedItem,
          openMainDialog: false,
          openFormDialog: true
        })
      },

      // === Filters ===
      filters: {
        types: [],
        rules: []
      },
      setFilters: (filters) => {
        const { nodes, edges } = get()
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        set({ filters, filteredNodes, filteredEdges })
      },

      toggleTypeFilter: (filter) => {
        const { filters, nodes, edges } = get()
        const newTypes = filters.types.map((f: TypeFilter) => {
          if (f.type === filter.type)
            return {
              type: f.type,
              checked: !f.checked
            }
          return f
        })
        const newFilters = { ...filters, types: newTypes }
        const filteredNodes = computeFilteredNodes(nodes, newFilters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        set({ filters: newFilters, filteredNodes, filteredEdges })
      },

      reset: () => {
        set({
          currentNodeId: null,
          currentEdgeId: null,
          selectedNodes: [],
          selectedEdges: [],
          relatedNodeToAdd: null,
          openMainDialog: false,
          openFormDialog: false,
          openAddRelationDialog: false,
          openNodeEditorModal: false,
          currentNodeType: null,
          filteredNodes: get().nodes,
          filteredEdges: get().edges
        })
      },

      // === Utils ===
      nodesLength: 0,
      edgesLength: 0
    }),
    {
      name: 'graph-store',
      partialize: (state) => ({ edgesLength: state.edgesLength })
    }
  )
)

function deleteKeys<T>(map: Map<string, T>, keys: Iterable<string>) {
  for (const key of keys) map.delete(key)
}
