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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/src/lib/supabase/client';
import IndividualNode from './nodes/individual';
import PhoneNode from './nodes/phone';
import CustomEdge from './custom-edge';
import IpNode from './nodes/ip_address';
import EmailNode from './nodes/email';
import { AlignCenterHorizontal, AlignCenterVertical, MaximizeIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import NewActions from './new-actions';
import { IconButton, Tooltip, Spinner } from '@radix-ui/themes';

const nodeTypes = { individual: IndividualNode, phone: PhoneNode, ip: IpNode, email: EmailNode };
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
    const { fitView, zoomIn, zoomOut, addNodes } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const ref = useRef(null);

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
            console.log(params)
            await supabase.from("relationships")
                .insert({ individual_a: params.source, individual_b: params.target, relation_type: "relation" })
            setEdges((els) => addEdge({ ...params, label: "relation", type: "custom" }, els))
        },
        [setEdges],
    );

    useEffect(() => {
        onLayout('LR')
    }, [initialEdges])

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
                fitView
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
                    <NewActions addNodes={addNodes} />
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
                </Panel>
                <Background />
                <MiniMap />
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