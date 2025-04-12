import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges, getIncomers, getOutgoers } from '@xyflow/react';
import { supabase } from '@/lib/supabase/client';
import { shallow } from 'zustand/shallow';
import {
    type Edge,
    type Node,
    type OnNodesChange,
    type OnEdgesChange,
} from '@xyflow/react';
import { getForceLayoutedElements, getDagreLayoutedElements } from '@/lib/utils';

export type AppNode = Node;

// Create selectors to minimize re-renders
export const selectNodes = (state: { nodes: any; }) => state.nodes;
export const selectEdges = (state: { edges: any; }) => state.edges;
export const selectCurrentNode = (state: { currentNode: any; }) => state.currentNode;
export const selectNodeHandlers = (state: { onNodesChange: any; onEdgesChange: any; onNodeClick: any; onPaneClick: any; }) => ({
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onNodeClick: state.onNodeClick,
    onPaneClick: state.onPaneClick,
});
export const selectEdgeHandlers = (state: { onConnect: any; }) => ({
    onConnect: state.onConnect,
});

export type AppState = {
    nodes: AppNode[];
    edges: Edge[];
    reloading: boolean;
    currentNode: Partial<Node> | null;
    onNodesChange: OnNodesChange<AppNode>;
    onEdgesChange: OnEdgesChange;
    setNodes: (nodes: AppNode[]) => void;
    setEdges: (edges: Edge[]) => void;
    highlightPath: (selectedNode: Node | null) => void;
    onLayout: (layout: string, fitView: () => void) => void,
    onConnect: (params: any, sketch_id?: string) => Promise<void>;
    onNodeClick: (_: React.MouseEvent, node: Node) => void;
    onPaneClick: (_: React.MouseEvent) => void,
    setCurrentNode: (node: object | null) => void;
    updateNode: (nodeId: string, nodeData: Partial<Node>) => void;
    resetNodeStyles: () => void;
};

// Create store with proper memoization
const createStore = (initialNodes: AppNode[] = [], initialEdges: Edge[] = []) => {
    return create<AppState>((set, get) => ({
        nodes: initialNodes,
        edges: initialEdges,
        currentNode: null,
        reloading: false,
        onNodesChange: (changes) => {
            set({
                nodes: applyNodeChanges(changes, get().nodes),
            });
        },
        onEdgesChange: (changes) => {
            set({
                edges: applyEdgeChanges(changes, get().edges),
            });
        },
        setCurrentNode: (node: Partial<Node> | null) => {
            set({ currentNode: node });
        },
        onConnect: async (params: any, sketch_id?: string) => {
            if (!sketch_id) return;
            try {
                // Batch database operations with the UI update
                const { error } = await supabase
                    .from("individuals_individuals")
                    .upsert({
                        individual_a: params.source,
                        individual_b: params.target,
                        sketch_id: sketch_id,
                        relation_type: "relation"
                    });
                if (!error) {
                    set({
                        edges: addEdge(
                            { ...params, label: "relation", type: "custom" },
                            get().edges
                        )
                    });
                }
            } catch (error) {
                console.error('Error creating relationship:', error);
            }
        },
        updateNode: (nodeId: string, nodeData: Partial<Node>) => {
            set((state) => ({
                nodes: state.nodes.map(node =>
                    node.id === nodeId
                        ? { ...node, ...nodeData }
                        : node
                )
            }));
        },
        setNodes: (nodes) => {
            set({ nodes });
        },
        setEdges: (edges) => {
            set({ edges });
        },
        resetNodeStyles: () => {
            set((state) => ({
                nodes: state.nodes.map(node => ({
                    ...node,
                    disabled: false,
                    draggable: true,
                    data: {
                        ...node.data,
                        forceToolbarVisible: false
                    },
                    style: {
                        ...node.style,
                        opacity: 1,
                    },
                })),
                edges: state.edges.map(edge => ({
                    ...edge,
                    animated: false,
                    style: {
                        ...edge.style,
                        stroke: "#b1b1b750",
                        opacity: 0.7,
                    },
                })),
            }));
        },
        onNodeClick: (_event: any, node: Partial<Node>) => {
            set({ currentNode: node });
            // get().resetNodeStyles();
        },
        onPaneClick: (_envent: any) => {
            set({ currentNode: null });
            // get().resetNodeStyles();
        },
        onLayout: (layout = "dagre", fitView: () => void) => {
            if (layout === "force") {
                const { nodes, edges } = getForceLayoutedElements(get().nodes, get().edges);
                // @ts-ignore
                set({ nodes, edges });
            } else {
                const { nodes, edges } = getDagreLayoutedElements(get().nodes, get().edges);
                // @ts-ignore
                set({ nodes, edges });
            }
            window.requestAnimationFrame(() => {
                fitView();
            });
        },
        highlightPath: (selectedNode: Node | null) => {
            if (!selectedNode) {
                set((state) => ({
                    nodes: state.nodes.map((node) => ({
                        ...node,
                        style: { ...node.style, opacity: 1 },
                    })),
                    edges: state.edges.map((edge) => ({
                        ...edge,
                        animated: false,
                        style: { ...edge.style, stroke: "#b1b1b750", opacity: 0.7 },
                    }))
                }));
                return;
            }

            // Calculate highlighted nodes and edges in one pass
            const nodes = get().nodes;
            const edges = get().edges;
            const allIncomers = getIncomers(selectedNode, nodes, edges);
            const allOutgoers = getOutgoers(selectedNode, nodes, edges);
            const incomerIds = new Set(allIncomers.map((node) => node.id));
            const outgoerIds = new Set(allOutgoers.map((node) => node.id));

            // Batch updates
            set({
                nodes: nodes.map((node) => {
                    const highlight = node.id === selectedNode.id || incomerIds.has(node.id) || outgoerIds.has(node.id);
                    return highlight ? {
                        ...node,
                        disabled: false,
                        draggable: true,
                        style: {
                            ...node.style,
                            opacity: 1,
                        },
                    } : {
                        ...node,
                        disabled: true,
                        draggable: false,
                        style: {
                            ...node.style,
                            opacity: 0.25,
                        },
                    };
                }),
                edges: edges.map((edge) => {
                    const animatedIn =
                        incomerIds.has(edge.source) && (incomerIds.has(edge.target) || selectedNode.id === edge.target);
                    const animatedOut =
                        outgoerIds.has(edge.target) && (outgoerIds.has(edge.source) || selectedNode.id === edge.source);
                    const animated = animatedIn || animatedOut;

                    return {
                        ...edge,
                        animated,
                        style: {
                            ...edge.style,
                            opacity: animated ? 1 : 0.25,
                        },
                    };
                })
            });
        },
    }));
};

// Initialize store once
export const useFlowStore = createStore();