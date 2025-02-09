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
    Edge,
    useNodeConnections,
    useInternalNode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/src/lib/supabase/client';
import IndividualNode from './nodes/individual';
import PhoneNode from './nodes/phone';
import CustomEdge from './custom-edge';
import IpNode from './nodes/ip_address';
import EmailNode from './nodes/email';
import SocialNode from './nodes/social'
import AddressNode from './nodes/physical_address'
import { AlignCenterHorizontal, AlignCenterVertical, LockOpenIcon, MaximizeIcon, RotateCcwIcon, ZoomInIcon, ZoomOutIcon, LockIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import NewActions from './new-actions';
import { IconButton, Tooltip, Spinner, Card, Flex } from '@radix-ui/themes';
import { isNode, isEdge, getIncomers, getOutgoers } from "@xyflow/react";
import { EdgeBase } from '@xyflow/system';
import { useInvestigationContext } from '../contexts/investigation-provider';

const nodeTypes = { individual: IndividualNode, phone: PhoneNode, ip: IpNode, email: EmailNode, social: SocialNode, address: AddressNode };
const edgeTypes = {
    'custom': CustomEdge,
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
    const [isLocked, setIsLocked] = useState(false)
    const { currentNode, setCurrentNode } = useInvestigationContext()
    const ref = useRef(null);
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
                            stroke: animated ? "#00D3F2" : "#b1b1b750",
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
            await supabase.from("relationships")
                .insert({ individual_a: params.source, individual_b: params.target, relation_type: "relation" })
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
            updateNode(internalNode.id, { ...internalNode, zIndex: 5000, style: { ...internalNode.style, opacity: 1 } })
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
                    <Tooltip content="Auto layout (vertical)">
                        <IconButton color="gray" variant="soft" onClick={() => onLayout('TB')}>
                            <AlignCenterVertical className='h-4 w-4' />
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Auto layout (horizontal)">
                        <IconButton color="gray" variant="soft" onClick={() => onLayout('LR')}>
                            <AlignCenterHorizontal className='h-4 w-4' />
                        </IconButton>
                    </Tooltip>
                </Panel>
                <Panel position="top-right" className='flex items-center gap-1'>
                    <Flex direction={"column"} align={"end"} gap={"1"}>
                        <Flex gap="1">
                            <Tooltip content="Reload schema">
                                <IconButton onClick={() => window.location.reload()} variant="soft">
                                    <RotateCcwIcon className='h-4 w-4' />
                                </IconButton>
                            </Tooltip>
                            <NewActions addNodes={addNodes} />
                        </Flex>
                        {currentNode &&
                            <Card>
                                {/* @ts-ignore */}
                                {getNode(currentNode)?.data?.label}
                            </Card>}
                    </Flex>
                </Panel>
                <Panel position="bottom-left" className='flex flex-col items-center gap-1'>
                    <Tooltip content="Center view">
                        {/* @ts-ignore */}
                        <IconButton color="gray" variant="soft" onClick={fitView}>
                            <MaximizeIcon className='h-4 w-4' />
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Zoom in">
                        {/* @ts-ignore */}
                        <IconButton color="gray" variant="soft" onClick={zoomIn}>
                            <ZoomInIcon className='h-4 w-4' />
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Zoom out">
                        {/* @ts-ignore */}
                        <IconButton color="gray" variant="soft" onClick={zoomOut}>
                            <ZoomOutIcon className='h-4 w-4' />
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Lock">
                        {/* @ts-ignore */}
                        <IconButton color="gray" variant="soft" onClick={() => setIsLocked((prev) => !prev)}>
                            {isLocked ? <LockIcon className='h-4 w-4' /> : <LockOpenIcon className='h-4 w-4' />}
                        </IconButton>
                    </Tooltip>
                </Panel>
                <Background />
                <MiniMap pannable />
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
        return <div className='h-[calc(100vh_-_48px)] w-full flex items-center justify-center'><Spinner size="3" />
        </div>
    }
    return (
        <ReactFlowProvider>
            <LayoutFlow {...props} theme={resolvedTheme} />
        </ReactFlowProvider>
    );
}