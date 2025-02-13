"use client"
import Dagre from '@dagrejs/dagre';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Panel,
    useNodesState,
    useEdgesState,
    useReactFlow,
    Background,
    addEdge,
    ColorMode,
    MiniMap,
    Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/lib/supabase/client';
import IndividualNode from './nodes/individual';
import PhoneNode from './nodes/phone';
// import CustomEdge from './custom-edge';
import IpNode from './nodes/ip_address';
import EmailNode from './nodes/email';
import SocialNode from './nodes/social'
import AddressNode from './nodes/physical_address'
import { AlignCenterHorizontal, AlignCenterVertical, MaximizeIcon, ZoomInIcon, ZoomOutIcon, RotateCwIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import NewActions from './new-actions';
import { getIncomers, getOutgoers } from "@xyflow/react";
import { EdgeBase } from '@xyflow/system';
import { useInvestigationContext } from '@/components/contexts/investigation-provider';
import FloatingEdge from './floating-edge';
import FloatingConnectionLine from './floating-connection';
import { useParams } from 'next/navigation';
import { Tooltip, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { Card } from '@/components/ui/card';
import { getInvestigationData } from '@/lib/actions/investigations';
import { cn } from '@/lib/utils';

const edgeTypes = {
    "custom": FloatingEdge
}
const nodeTypes = { individual: IndividualNode, phone: PhoneNode, ip: IpNode, email: EmailNode, social: SocialNode, address: AddressNode };
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
            // We are shifting the dagre node position (anchor=center center) to the top left
            // so it matches the React Flow node anchor point (top left).
            const x = position.x - (node.measured?.width ?? 0) / 2;
            const y = position.y - (node.measured?.height ?? 0) / 2;

            return { ...node, position: { x, y } };
        }),
        edges,
    };
};

const LayoutFlow = ({ initialNodes, initialEdges, theme }: { initialNodes: any, initialEdges: any, theme: ColorMode }) => {
    const { fitView, zoomIn, zoomOut, addNodes, getNodes, getEdges, setCenter, getNode, updateNode } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const { investigation_id } = useParams()
    const [loading, setLoading] = useState(false)
    const { currentNode, setCurrentNode, settings } = useInvestigationContext()
    const ref = useRef(null);

    // const edgeTypes = useMemo(() => ({
    //     'custom': settings.floatingEdges ? FloatingEdge : CustomEdge,
    // }), [settings.floatingEdges]);

    const getAllIncomers = useCallback((node: any, nodes: any[], edges: EdgeBase[], prevIncomers = []) => {
        const incomers = getIncomers(node, nodes, edges);
        const result = incomers.reduce(
            (memo, incomer) => {
                memo.push(incomer);
                //@ts-ignore
                if ((prevIncomers.findIndex(n => n.id == incomer.id) == -1)) {
                    prevIncomers.push(incomer as never);

                    getAllIncomers(incomer, nodes, edges, prevIncomers).forEach((foundNode: { id: any; }) => {
                        memo.push(foundNode);
                        //@ts-ignore
                        if ((prevIncomers.findIndex(n => n.id == foundNode.id) == -1)) {
                            prevIncomers.push(incomer as never);

                        }
                    });
                }
                return memo;
            },
            []
        );
        return result;
    }, [])

    const getAllOutgoers = useCallback((node: any, nodes: any[], edges: EdgeBase[], prevOutgoers: any = []) => {
        const outgoers = getOutgoers(node, nodes, edges);
        return outgoers.reduce(
            (memo, outgoer) => {
                memo.push(outgoer);
                if ((prevOutgoers.findIndex((n: any) => n.id == outgoer.id) == -1)) {
                    prevOutgoers.push(outgoer);
                    getAllOutgoers(outgoer, nodes, edges, prevOutgoers).forEach((foundNode: { id: any; }) => {
                        memo.push(foundNode);
                        if ((prevOutgoers.findIndex((n: any) => n.id == foundNode.id) == -1)) {
                            prevOutgoers.push(foundNode);
                        }
                    });
                }
                return memo;
            },
            []
        )
    }, [])

    const highlightPath = useCallback(
        (selectedNode: Node | null) => {
            if (!selectedNode) {
                setNodes((nodes) =>
                    nodes.map((node) => ({
                        ...node,
                        style: { ...node.style, opacity: 1 },
                    })),
                )
                setEdges((edges) =>
                    edges.map((edge) => ({
                        ...edge,
                        animated: false,
                        style: { ...edge.style, stroke: "#b1b1b750", opacity: 1 },
                    })),
                )
                return
            }
            const nodes = getNodes()
            const edges = getEdges()
            const allIncomers = getIncomers(selectedNode, nodes, edges)
            const allOutgoers = getOutgoers(selectedNode, nodes, edges)
            const incomerIds = new Set(allIncomers.map((node) => node.id))
            const outgoerIds = new Set(allOutgoers.map((node) => node.id))
            setNodes((prevNodes) =>
                prevNodes.map((node) => {
                    const highlight = node.id === selectedNode.id || incomerIds.has(node.id) || outgoerIds.has(node.id)
                    return {
                        ...node,
                        disabled: !highlight,
                        draggable: highlight,
                        style: {
                            ...node.style,
                            opacity: highlight ? 1 : 0.25,
                        },
                    }
                }),
            )
            setEdges((prevEdges) =>
                prevEdges.map((edge) => {
                    const animatedIn =
                        incomerIds.has(edge.source) && (incomerIds.has(edge.target) || selectedNode.id === edge.target)
                    const animatedOut =
                        outgoerIds.has(edge.target) && (outgoerIds.has(edge.source) || selectedNode.id === edge.source)
                    const animated = animatedIn || animatedOut
                    return {
                        ...edge,
                        animated,
                        style: {
                            ...edge.style,
                            stroke: animated ? "var(--primary)" : "#b1b1b750",
                            opacity: animated ? 1 : 0.25,
                        },
                    }
                }),
            )
        },
        [getNodes, getEdges, setNodes, setEdges],
    )

    const resetNodeStyles = useCallback(() => {
        setNodes((nodes) =>
            nodes.map((node) => ({
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
        )
        setEdges((edges) =>
            edges.map((edge) => ({
                ...edge,
                animated: false, // Désactive l'animation
                style: {
                    ...edge.style,
                    stroke: "#b1b1b750",
                    opacity: 1,
                },
            })),
        )
    }, [setNodes, setEdges])

    const onLayout = useCallback(
        (direction: any) => {
            const layouted = getLayoutedElements(nodes, edges, { direction });
            setNodes([...layouted.nodes]);
            setEdges([...layouted.edges]);
            window.requestAnimationFrame(() => {
                fitView();
            });
        },
        [nodes, edges],
    );
    const onConnect = useCallback(
        async (params: any) => {
            if (!investigation_id) return
            await supabase.from("relationships")
                .upsert({ individual_a: params.source, individual_b: params.target, investigation_id: investigation_id, relation_type: "relation" })
            setEdges((els) => addEdge({ ...params, label: "relation", type: "custom" }, els))
        },
        [setEdges],
    );

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            setCurrentNode(node.id)
        },
        [],
    )

    useEffect(() => {
        resetNodeStyles()
        if (currentNode) {
            const internalNode = getNode(currentNode)
            if (!internalNode) return
            updateNode(internalNode.id, { ...internalNode, zIndex: 5000, data: { ...internalNode.data, forceToolbarVisible: true }, style: { ...internalNode.style, opacity: 1 } })
            //@ts-ignore
            setCenter(internalNode?.position.x + (internalNode?.measured?.width / 2), internalNode?.position.y + (internalNode?.measured?.height / 2) + 20, { duration: 1000, zoom: 1.5 })
            highlightPath(internalNode);
        }
    }, [currentNode, highlightPath, setCenter, resetNodeStyles]);

    const onPaneClick = useCallback(
        () => {
            setCurrentNode(null)
            resetNodeStyles()
        },
        [resetNodeStyles],
    )

    useEffect(() => {
        onLayout('LR')
    }, [initialNodes, initialEdges])

    const handleRefresh = useCallback(
        async () => {
            setLoading(true);
            const { nodes: newNodes, edges: newEdges } = await getInvestigationData(investigation_id as string);
            setNodes([...newNodes]);
            setEdges([...newEdges]);
            onLayout('LR');
            setLoading(false);
        }, []);

    return (
        <div className='h-[calc(100vh_-_48px)]'>
            <ReactFlow
                colorMode={theme}
                ref={ref}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                minZoom={0.1}
                connectionLineComponent={FloatingConnectionLine as any}
                // edgesUpdatable={!isLocked}
                // edgesFocusable={!isLocked}
                // nodesDraggable={!isLocked}
                // nodesConnectable={!isLocked}
                // nodesFocusable={!isLocked}
                // elementsSelectable={!isLocked}
                fitView
                proOptions={{
                    hideAttribution: true
                }}
                nodeTypes={nodeTypes}
                // @ts-ignore
                edgeTypes={edgeTypes}
            >
                <Panel position="top-left" className='flex items-center gap-1'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => onLayout('TB')}>
                                <AlignCenterVertical className='h-4 w-4' />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Auto layout (vertical)
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => onLayout('LR')}>
                                <AlignCenterHorizontal className='h-4 w-4' />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Auto layout (horizontal)
                        </TooltipContent>
                    </Tooltip>
                </Panel>
                <Panel position="top-right" className='flex items-center gap-1'>
                    <div className='flex flex-col items-end gap-2'>
                        <div className='flex gap-1 items-center'>
                            <Button size="icon" disabled={loading} variant="outline" onClick={handleRefresh}>
                                <RotateCwIcon className={cn('h-4 w-4', loading && 'animate-spin')} />
                            </Button>
                            <NewActions addNodes={addNodes} />
                        </div>
                        {currentNode &&
                            <Card>
                                {/* @ts-ignore */}
                                {getNode(currentNode)?.data?.label}
                            </Card>}
                    </div>
                </Panel>
                <Panel position="bottom-left" className='flex flex-col items-center gap-1'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* @ts-ignore */}
                            <Button size="icon" variant="outline" onClick={fitView}>
                                <MaximizeIcon className='h-4 w-4' />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Center view
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* @ts-ignore */}
                            <Button size="icon" variant="outline" onClick={zoomIn}>
                                <ZoomInIcon className='h-4 w-4' />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Zoom in
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* @ts-ignore */}
                            <Button size="icon" variant="outline" onClick={zoomOut}>
                                <ZoomOutIcon className='h-4 w-4' />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Zoom out
                        </TooltipContent>
                    </Tooltip>
                </Panel>
                <Background />
                {settings.showMiniMap && <MiniMap pannable />}
            </ReactFlow>
        </div>
    );
};

export default function (props: any) {
    const [mounted, setMounted] = useState(false)
    const { resolvedTheme } = useTheme()
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className='h-[calc(100vh_-_48px)] w-full flex items-center justify-center'>Loading...
        </div>
    }
    return (
        <ReactFlowProvider>
            <LayoutFlow {...props} theme={resolvedTheme} />
        </ReactFlowProvider>
    );
}