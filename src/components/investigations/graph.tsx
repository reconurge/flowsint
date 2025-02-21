"use client"
import React, { useEffect, useState } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Panel,
    useReactFlow,
    Background,
    ColorMode,
    MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import IndividualNode from './nodes/individual';
import PhoneNode from './nodes/phone';
import IpNode from './nodes/ip_address';
import EmailNode from './nodes/email';
import SocialNode from './nodes/social';
import AddressNode from './nodes/physical_address';
import { AlignCenterHorizontal, AlignCenterVertical, MaximizeIcon, ZoomInIcon, ZoomOutIcon, RotateCwIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import NewActions from './new-actions';
import FloatingEdge from './floating-edge';
import FloatingConnectionLine from './floating-connection';
import { useParams } from 'next/navigation';
import { Tooltip, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import { useInvestigationStore } from '@/store/investigation-store';
import { useFlowStore } from '../../store/flow-store';
// import CurrentNode from './current-node-card';

const edgeTypes = {
    "custom": FloatingEdge
};

const nodeTypes = {
    individual: IndividualNode,
    phone: PhoneNode,
    ip: IpNode,
    email: EmailNode,
    social: SocialNode,
    address: AddressNode
};

const LayoutFlow = ({ refetch, theme }: { refetch: any, theme: ColorMode }) => {
    const { fitView, zoomIn, zoomOut, addNodes, getNode, setCenter } = useReactFlow();
    const { investigation_id } = useParams();
    const { settings } = useInvestigationStore();

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        onLayout,
        onNodeClick,
        onPaneClick,
        currentNode,
        resetNodeStyles,
        reloading
    } = useFlowStore();

    useEffect(() => {
        resetNodeStyles();
        if (currentNode) {
            const internalNode = getNode(currentNode);
            if (!internalNode) return;
            useFlowStore.getState().updateNode(internalNode.id, {
                ...internalNode,
                zIndex: 5000,
                data: { ...internalNode.data, forceToolbarVisible: true },
                style: { ...internalNode.style, opacity: 1 }
            });
            const nodeWidth = internalNode.measured?.width ?? 0;
            const nodeHeight = internalNode.measured?.height ?? 0;
            setCenter(
                internalNode.position.x + (nodeWidth / 2),
                internalNode.position.y + (nodeHeight / 2) + 20,
                { duration: 1000, zoom: 1.5 }
            );
            useFlowStore.getState().highlightPath(internalNode);
        }
    }, [currentNode, getNode, setCenter]);

    useEffect(() => {
        onLayout('LR', fitView);
    }, []);

    return (
        <div className='h-[calc(100vh_-_48px)]'>
            <ReactFlow
                colorMode={theme}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={(p: any) => onConnect(p, investigation_id as string)}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                minZoom={0.1}
                connectionLineComponent={FloatingConnectionLine as any}
                fitView
                proOptions={{ hideAttribution: true }}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                className='!bg-background'
            >
                <Panel position="top-left" className='flex items-center gap-1'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => onLayout('TB', fitView)}>
                                <AlignCenterVertical className='h-4 w-4' />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Auto layout (vertical)
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => onLayout('LR', fitView)}>
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
                            <Button size="icon" disabled={reloading} variant="outline" onClick={refetch}>
                                <RotateCwIcon className={cn('h-4 w-4', reloading && 'animate-spin')} />
                            </Button>
                            <NewActions addNodes={addNodes} />
                        </div>
                        {/* {currentNode && getNode(currentNode) && (
                            getNode(currentNode)?.type === "individual" ?
                                // @ts-ignore
                                <CurrentNode individual={getNode(currentNode).data} /> :
                                <Card className='p-3 bg-background'>
                                    <>
                                        {getNode(currentNode)?.data.label}
                                    </>
                                </Card>
                        )} */}
                    </div>
                </Panel>
                <Panel position="bottom-left" className='flex flex-col items-center gap-1'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => fitView()}>
                                <MaximizeIcon className='h-4 w-4' />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Center view
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => zoomIn()}>
                                <ZoomInIcon className='h-4 w-4' />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Zoom in
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => zoomOut()}>
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

export default function Graph({ graphQuery }: { graphQuery: any }) {
    const [mounted, setMounted] = useState(false);
    const { refetch, isLoading, data } = graphQuery
    const { resolvedTheme } = useTheme();
    useEffect(() => {
        setMounted(true);
    }, []);
    useEffect(() => {
        if (data) {
            useFlowStore.setState({ nodes: data?.nodes, edges: data?.edges });
            setMounted(true);
        }
    }, [data, data?.nodes, data?.edges]);

    if (!mounted || isLoading) {
        return (
            <div className='h-[calc(100vh_-_48px)] w-full flex items-center justify-center'>
                Loading...
            </div>
        );
    }

    return (
        <ReactFlowProvider>
            <LayoutFlow refetch={refetch} theme={resolvedTheme as ColorMode} />
        </ReactFlowProvider>
    );
}