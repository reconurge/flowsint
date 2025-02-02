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
import CustomNode from './custom-node';
import CustomEdge from './custom-edge';
import { Button } from '@heroui/button';
import { AlignCenterHorizontal, AlignCenterVertical, MaximizeIcon, PlusIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import ContextMenu from './context-menu';
import { useTheme } from 'next-themes';
import { Spinner, Tooltip } from '@heroui/react';
import NewActions from './new-actions';
import { useInvestigationContext } from './investigation-provider';

const nodeTypes = { custom: CustomNode };
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
    const { fitView, zoomIn, zoomOut, addEdges, addNodes } = useReactFlow();
    const { investigation } = useInvestigationContext()
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [menu, setMenu] = useState<null | any>(null);
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
        (params: any) => setEdges((els) => addEdge(params, els)),
        [setEdges],
    );
    const onNodeContextMenu = useCallback(
        (event: { preventDefault: () => void; clientY: number; clientX: number; }, node: { id: any; }) => {
            event.preventDefault();
            // @ts-ignore
            const pane = ref.current.getBoundingClientRect();
            setMenu({
                id: node.id,
                top: event.clientY < pane.height - 100 && event.clientY,
                left: event.clientX < pane.width - 100 && event.clientX,
                right: event.clientX >= pane.width - 100 && pane.width - event.clientX,
                bottom:
                    event.clientY >= pane.height - 100 && pane.height - event.clientY,
            });
        },
        [setMenu],
    );
    const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

    const handleAddNode = async () => {
        if (!investigation) return
        // create individual
        const individual = await supabase.from("individuals").insert({
            full_name: "Franck Marshall",
        }).select("*")
            .single()
            .then(({ data, error }) => {
                if (error)
                    console.log(error)
                return data
            })
        if (!individual) return
        // create relation to investigation
        await supabase.from("investigation_individuals").insert({
            individual_id: individual.id,
            investigation_id: investigation.id
        }).then(({ error }) => console.log(error))
        addNodes({
            id: individual.id.toString(),
            type: 'custom',
            data: { ...individual, label: individual.full_name },
            position: { x: 0, y: 100 }
        });
    }

    const handleAddEdge = async () => {

    }

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
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
                fitView
                nodeTypes={nodeTypes}
                // @ts-ignore
                edgeTypes={edgeTypes}
            >
                <Panel position="top-left" className='flex items-center gap-1'>
                    <Tooltip showArrow content="Auto layout (vertical)" placement={"bottom-start"}>
                        <Button onPress={() => onLayout('TB')} size="sm" isIconOnly aria-label="options" variant='bordered'>
                            <AlignCenterVertical className='h-4 w-4' />
                        </Button>
                    </Tooltip>
                    <Tooltip showArrow content="Auto layout (horizontal)" placement={"bottom-start"}>
                        <Button onPress={() => onLayout('LR')} size="sm" isIconOnly aria-label="options" variant='bordered'>
                            <AlignCenterHorizontal className='h-4 w-4' />
                        </Button>
                    </Tooltip>
                </Panel>
                <Panel position="top-right" className='flex items-center gap-1'>
                    <NewActions handleAddEdge={handleAddEdge} handleAddNode={handleAddNode} />
                </Panel>
                <Panel position="bottom-left" className='flex flex-col items-center gap-1'>
                    <Tooltip showArrow delay={1000} content="Center view" placement={"right"}>
                        {/* @ts-ignore */}
                        <Button onPress={fitView} placement={"right"} size="sm" isIconOnly aria-label="options" variant='bordered'>
                            <MaximizeIcon className='h-4 w-4' />
                        </Button>
                    </Tooltip>
                    <Tooltip showArrow delay={1000} placement={"right"} content="Zoom in">
                        {/* @ts-ignore */}
                        <Button onPress={zoomIn} size="sm" isIconOnly aria-label="options" variant='bordered'>
                            <ZoomInIcon className='h-4 w-4' />
                        </Button>
                    </Tooltip>
                    <Tooltip showArrow delay={1000} placement={"right"} content="Zoom out">
                        {/* @ts-ignore */}
                        <Button onPress={zoomOut} size="sm" isIconOnly aria-label="options" variant='bordered'>
                            <ZoomOutIcon className='h-4 w-4' />
                        </Button>
                    </Tooltip>
                </Panel>
                <Background />
                {menu && <ContextMenu onClick={onPaneClick} {...menu} />}
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
        return <div className='h-[calc(100vh_-_48px)] w-full flex items-center justify-center'><Spinner color="primary" label="Loading schema..." /></div>
    }
    return (
        <ReactFlowProvider>
            <LayoutFlow {...props} theme={resolvedTheme} />
        </ReactFlowProvider>
    );
}