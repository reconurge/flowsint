import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges, getIncomers, getOutgoers } from '@xyflow/react';
import Dagre from '@dagrejs/dagre';
import { supabase } from '@/lib/supabase/client';
import {
    type Edge,
    type Node,
    type OnNodesChange,
    type OnEdgesChange,
} from '@xyflow/react';

export type AppNode = Node;

export type AppState = {
    nodes: AppNode[];
    edges: Edge[];
    reloading: boolean;
    currentNode: string | null;
    onNodesChange: OnNodesChange<AppNode>;
    onEdgesChange: OnEdgesChange;
    setNodes: (nodes: AppNode[]) => void;
    setEdges: (edges: Edge[]) => void;
    highlightPath: (selectedNode: Node | null) => void;
    onLayout: (direct: string, fitView: () => void) => void,
    onConnect: (params: any, investigation_id?: string) => Promise<void>;
    onNodeClick: (_: React.MouseEvent, node: Node) => void;
    onPaneClick: (_: React.MouseEvent) => void,
    setCurrentNode: (nodeId: string | null) => void;
    updateNode: (nodeId: string, nodeData: Partial<Node>) => void;
    resetNodeStyles: () => void;
};
const getLayoutedElements = (nodes: any[], edges: any[], options: { direction: any; }) => {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: options.direction });

    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    nodes.forEach((node) =>
        g.setNode(node.id, {
            ...node,
            width: node.measured?.width ?? 0,
            height: node.measured?.height ?? 0,
        }),
    );
    Dagre.layout(g);
    return {
        nodes: nodes.map((node) => {
            const position = g.node(node.id);
            const x = position.x - (node.measured?.width ?? 0) / 2;
            const y = position.y - (node.measured?.height ?? 0) / 2;
            return { ...node, position: { x, y } };
        }),
        edges,
    };
};
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
        setCurrentNode: (nodeId: string | null) => {
            set({ currentNode: nodeId });
        },
        onConnect: async (params: any, investigation_id?: string) => {
            console.log(investigation_id)
            if (!investigation_id) return;
            try {
                // Insertion dans Supabase
                await supabase
                    .from("relationships")
                    .upsert({
                        individual_a: params.source,
                        individual_b: params.target,
                        investigation_id: investigation_id,
                        relation_type: "relation"
                    });
                set({
                    edges: addEdge(
                        { ...params, label: "relation", type: "custom" },
                        get().edges
                    )
                });
            } catch (error) {
                console.error('Error creating relationship:', error);
            }
        },
        updateNode: (nodeId: string, nodeData: Partial<Node>) => {
            set({
                nodes: get().nodes.map(node =>
                    node.id === nodeId
                        ? { ...node, ...nodeData }
                        : node
                )
            });
        },
        setNodes: (nodes) => {
            set({ nodes });
        },
        setEdges: (edges) => {
            set({ edges });
        },
        resetNodeStyles: () => {
            set({
                nodes: get().nodes.map(node => ({
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
            });
            set({
                edges: get().edges.map(edge => ({
                    ...edge,
                    animated: false,
                    style: {
                        ...edge.style,
                        stroke: "#b1b1b750",
                        opacity: 1,
                    },
                })),
            });
        },
        onNodeClick: (_event: any, node: { id: string; }) => {
            set({ currentNode: node.id });
            get().resetNodeStyles();
        },
        onPaneClick: (_envent: any) => {
            set({ currentNode: null });
            get().resetNodeStyles();

        },
        onLayout: (direction = 'TB', fitView: () => void) => {
            const { nodes, edges } = getLayoutedElements(get().nodes, get().edges, { direction });
            set({ nodes });
            set({ edges });
            fitView();
        },
        highlightPath: (selectedNode: Node | null) => {
            if (!selectedNode) {
                set({
                    nodes: get().nodes.map((node) => ({
                        ...node,
                        style: { ...node.style, opacity: 1 },
                    })),
                    edges: get().edges.map((edge) => ({
                        ...edge,
                        animated: false,
                        style: { ...edge.style, stroke: "#b1b1b750", opacity: 1 },
                    }))
                });
                return;
            }
            const nodes = get().nodes;
            const edges = get().edges;
            const allIncomers = getIncomers(selectedNode, nodes, edges);
            const allOutgoers = getOutgoers(selectedNode, nodes, edges);
            const incomerIds = new Set(allIncomers.map((node) => node.id));
            const outgoerIds = new Set(allOutgoers.map((node) => node.id));
            set({
                nodes: nodes.map((node) => {
                    const highlight = node.id === selectedNode.id || incomerIds.has(node.id) || outgoerIds.has(node.id);
                    return {
                        ...node,
                        disabled: !highlight,
                        draggable: highlight,
                        style: {
                            ...node.style,
                            opacity: highlight ? 1 : 0.25,
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
                            stroke: animated ? "var(--primary)" : "#b1b1b750",
                            opacity: animated ? 1 : 0.25,
                        },
                    };
                })
            });
        },
    }))
}
export const useFlowStore = createStore();
