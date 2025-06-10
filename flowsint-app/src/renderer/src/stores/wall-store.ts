import { create } from "zustand"
import { Node, Edge, Connection } from "@xyflow/react"

interface WallState {
    nodes: Node[]
    edges: Edge[]
    currentNode: Node | null
    selectedNodes: Node[]
    onNodesChange: (changes: any) => void
    onEdgesChange: (changes: any) => void
    onConnect: (connection: Connection) => void
    setCurrentNode: (node: Node | null) => void
    setSelectedNodes: (nodes: Node[]) => void
    saveWall: (nodes: Node[], edges: Edge[]) => Promise<void>
    deleteWall: () => Promise<void>
}

export const useWallStore = create<WallState>((set) => ({
    nodes: [],
    edges: [],
    currentNode: null,
    selectedNodes: [],
    onNodesChange: (changes) =>
        set((state) => ({
            nodes: changes.reduce((acc: Node[], change: any) => {
                if (change.type === "remove") {
                    return acc.filter((node) => node.id !== change.id)
                }
                if (change.type === "add") {
                    return [...acc, change.item]
                }
                if (change.type === "position" || change.type === "dimensions") {
                    return acc.map((node) =>
                        node.id === change.id ? { ...node, ...change } : node
                    )
                }
                return acc
            }, state.nodes),
        })),
    onEdgesChange: (changes) =>
        set((state) => ({
            edges: changes.reduce((acc: Edge[], change: any) => {
                if (change.type === "remove") {
                    return acc.filter((edge) => edge.id !== change.id)
                }
                if (change.type === "add") {
                    return [...acc, change.item]
                }
                return acc
            }, state.edges),
        })),
    onConnect: (connection) =>
        set((state) => ({
            edges: [
                ...state.edges,
                {
                    id: `e${state.edges.length + 1}`,
                    source: connection.source!,
                    target: connection.target!,
                },
            ],
        })),
    setCurrentNode: (node) => set({ currentNode: node }),
    setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
    saveWall: async (nodes, edges) => {
        // TODO: Implement save functionality
        console.log('Saving wall:', { nodes, edges })
    },
    deleteWall: async () => {
        // TODO: Implement delete functionality
        console.log('Deleting wall')
    }
})) 