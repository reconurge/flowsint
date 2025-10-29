import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GraphNode, GraphEdge, NodeData } from '@/types'
import { type ActionItem } from '@/lib/action-items'

export type TypeFilter = {
  type: string
  checked: boolean
}
export type Filters = {
  types: TypeFilter[]
}

interface GraphState {
  // === Graph ===
  nodes: GraphNode[]
  edges: GraphEdge[]
  filteredNodes: GraphNode[]
  filteredEdges: GraphEdge[]
  setNodes: (nodes: GraphNode[]) => void
  setEdges: (edges: GraphEdge[]) => void
  addNode: (newNode: Partial<GraphNode>) => GraphNode
  addEdge: (newEdge: Partial<GraphEdge>) => GraphEdge
  removeNodes: (nodeIds: string[]) => void
  removeEdges: (edgeIds: string[]) => void
  updateGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void
  updateNode: (nodeId: string, updates: Partial<NodeData>) => void
  updateEdge: (edgeId: string, updates: Partial<GraphEdge>) => void
  replaceNodeId: (oldId: string, newId: string) => void
  reset: () => void

  // === Selection & Current ===
  currentNode: GraphNode | null
  selectedNodes: GraphNode[]
  setCurrentNode: (node: GraphNode | null) => void
  setSelectedNodes: (nodes: GraphNode[]) => void
  clearSelectedNodes: () => void
  toggleNodeSelection: (node: GraphNode, multiSelect?: boolean) => void

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
  handleOpenFormModal: (selectedItem: ActionItem | undefined) => void

  // === Action Type for Edit form ===
  handleEdit: (node: GraphNode) => void

  // === Filters ===
  filters: Filters
  setFilters: (filters: Filters) => void
  toggleTypeFilter: (filter: TypeFilter) => void

  // === Collapse/Expand logic ===
  toggleCollapse: (nodeId: string) => void

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
  return nodes.filter((node) => !types.includes(node.data.type))
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
      getNodesLength: () => get().nodes.length,
      getEdgesLength: () => get().edges.length,

      setNodes: (nodes) => {
        const { filters, edges } = get()
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        set({ nodes, filteredNodes, filteredEdges })
      },
      setEdges: (edges) => {
        const { filters, nodes } = get()
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        set({ edges, filteredNodes, filteredEdges })
      },

      addNode: (newNode) => {
        const { nodes, edges, filters } = get()
        const nodeWithId: GraphNode = {
          id: newNode.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          position: { x: 0, y: 0 },
          ...newNode
        } as GraphNode
        const newNodes = [...nodes, nodeWithId]
        const filteredNodes = computeFilteredNodes(newNodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        set({ nodes: newNodes, currentNode: nodeWithId, filteredNodes, filteredEdges })
        return nodeWithId
      },

      addEdge: (newEdge) => {
        const { edges, nodes, filters } = get()
        const edgeWithId: GraphEdge = {
          id: newEdge.id || `edge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          ...newEdge
        } as GraphEdge
        const newEdges = [...edges, edgeWithId]
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(newEdges, filteredNodes)
        set({ edges: newEdges, filteredNodes, filteredEdges })
        return edgeWithId
      },

      removeNodes: (nodeIds: string[]) => {
        const { nodes, edges, filters } = get()
        const newNodes = nodes.filter((n) => !nodeIds.includes(n.id))
        const newEdges = edges.filter(
          (e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
        )
        const filteredNodes = computeFilteredNodes(newNodes, filters)
        const filteredEdges = computeFilteredEdges(newEdges, filteredNodes)
        set({ nodes: newNodes, edges: newEdges, filteredNodes, filteredEdges })
      },

      removeEdges: (edgeIds: string[]) => {
        const { edges, nodes, filters } = get()
        const newEdges = edges.filter((e) => !edgeIds.includes(e.id))
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(newEdges, filteredNodes)
        set({ edges: newEdges, filteredNodes, filteredEdges })
      },

      updateGraphData: (nodes, edges) => {
        const { filters } = get()
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        set({ nodes, edges, filteredNodes, filteredEdges })
      },

      updateNode: (nodeId, updates) => {
        const { nodes, edges, filters } = get()
        const updatedNodes = nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node
        )
        const filteredNodes = computeFilteredNodes(updatedNodes, filters)
        const filteredEdges = computeFilteredEdges(edges, filteredNodes)
        set({ nodes: updatedNodes, filteredNodes, filteredEdges })
      },

      updateEdge: (edgeId, updates) => {
        const { edges, nodes, filters } = get()
        const updatedEdges = edges.map((edge) =>
          edge.id === edgeId ? { ...edge, data: { ...edge, ...updates } as GraphEdge } : edge
        )
        const filteredNodes = computeFilteredNodes(nodes, filters)
        const filteredEdges = computeFilteredEdges(updatedEdges, filteredNodes)
        set({ edges: updatedEdges, filteredNodes, filteredEdges })
      },

      replaceNodeId: (oldId, newId) => {
        const { nodes, edges, filters, currentNode } = get()
        // Update the node's ID and data.id
        const updatedNodes = nodes.map((node) =>
          node.id === oldId ? { ...node, id: newId, data: { ...node.data, id: newId } } : node
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
        // Update currentNode if it matches the old ID
        const updatedCurrentNode = currentNode?.id === oldId
          ? { ...currentNode, id: newId, data: { ...currentNode.data, id: newId } }
          : currentNode
        set({ nodes: updatedNodes, edges: updatedEdges, filteredNodes, filteredEdges, currentNode: updatedCurrentNode })
      },

      // === Selection & Current ===
      currentNode: null,
      selectedNodes: [],
      setCurrentNode: (node) => {
        const { currentNode } = get()
        // Only update if the node is actually different
        if (currentNode?.id !== node?.id) {
          set({ currentNode: node })
        }
      },
      setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
      clearSelectedNodes: () => set({ selectedNodes: [], currentNode: null }),
      toggleNodeSelection: (node, multiSelect = false) => {
        const { selectedNodes, currentNode } = get()
        const isSelected = selectedNodes.some((n) => n.id === node.id)
        let newSelected: GraphNode[]
        let newCurrentNode = currentNode

        if (multiSelect) {
          newSelected = isSelected
            ? selectedNodes.filter((n) => n.id !== node.id)
            : [...selectedNodes, node]
        } else {
          newSelected = isSelected && selectedNodes.length === 1 ? [] : [node]
          // Only update currentNode if it's actually different
          if (!multiSelect) {
            newCurrentNode = isSelected ? null : node
          }
        }

        // Only update if there are actual changes
        const hasSelectionChanges =
          newSelected.length !== selectedNodes.length ||
          newSelected.some((n, i) => n.id !== selectedNodes[i]?.id)
        const hasCurrentNodeChanges = newCurrentNode?.id !== currentNode?.id

        if (hasSelectionChanges || hasCurrentNodeChanges) {
          set({
            selectedNodes: newSelected,
            currentNode: newCurrentNode
          })
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
        const { currentNode, openNodeEditorModal } = get()
        // Only update if the node is actually different
        if (currentNode?.id !== node.id) {
          set({ currentNode: node, openNodeEditorModal: true })
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
        types: [
          {
            type: 'domain',
            checked: true
          },
          {
            type: 'ip',
            checked: true
          },
          {
            type: 'individual',
            checked: true
          }
        ]
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

      // === Collapse/Expand logic ===
      toggleCollapse: (nodeId) => {
        const { nodes, edges, filters } = get()
        const node = nodes.find((n) => n.id === nodeId)
        if (!node) return
        const isCollapsing = !node.collapsed

        const getDescendants = (parentId: string, accNodes: Set<string>, accEdges: Set<string>) => {
          edges.forEach((edge) => {
            if (edge.source === parentId) {
              accEdges.add(edge.id)
              accNodes.add(edge.target)
              getDescendants(edge.target, accNodes, accEdges)
            }
          })
        }

        const descendantNodeIds = new Set<string>()
        const descendantEdgeIds = new Set<string>()
        getDescendants(nodeId, descendantNodeIds, descendantEdgeIds)

        const newNodes = nodes.map((n) =>
          n.id === nodeId
            ? { ...n, collapsed: isCollapsing }
            : descendantNodeIds.has(n.id)
              ? { ...n, hidden: isCollapsing }
              : n
        )
        const newEdges = edges.map((e) =>
          descendantEdgeIds.has(e.id) ? { ...e, hidden: isCollapsing } : e
        )

        const filteredNodes = computeFilteredNodes(newNodes, filters)
        const filteredEdges = computeFilteredEdges(newEdges, filteredNodes)
        set({ nodes: newNodes, edges: newEdges, filteredNodes, filteredEdges })
      },

      reset: () => {
        set({
          currentNode: null,
          selectedNodes: [],
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
