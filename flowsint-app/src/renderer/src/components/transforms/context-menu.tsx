import React, { memo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Info, Pencil, Star, Trash } from 'lucide-react';
import { GraphNode } from '@/stores/graph-store';
import { cn } from '@/lib/utils';
import BaseContextMenu from '@/components/xyflow/context-menu';
import { TransformNode, useTransformStore } from '@/stores/transform-store';

interface GraphContextMenuProps {
    node: GraphNode | TransformNode;
    top: number;
    left: number;
    right: number;
    bottom: number;
    wrapperWidth: number;
    wrapperHeight: number;
    onEdit?: () => void;
    onDelete?: () => void;
    setMenu: (menu: any | null) => void;
    [key: string]: any;
}

export default function ContextMenu({
    node,
    top,
    left,
    right,
    bottom,
    wrapperWidth,
    wrapperHeight,
    onEdit,
    onDelete,
    setMenu,
    ...props
}: GraphContextMenuProps) {

    const setOpenParamsDialog = useTransformStore(s => s.setOpenParamsDialog)
    const handleOpenParamsModal = useCallback(() => {
        setOpenParamsDialog(true, node as TransformNode)
        setMenu(null)
    }, [setOpenParamsDialog, node, setMenu])

    return (
        <BaseContextMenu
            node={node}
            top={top}
            left={left}
            right={right}
            bottom={bottom}
            wrapperWidth={wrapperWidth}
            wrapperHeight={wrapperHeight}
            {...props}
        >
            {/* Header with title and action buttons */}
            <div className="px-3 py-2 border-b gap-1 border-border flex items-center justify-between flex-shrink-0">
                <div className='flex text-xs items-center gap-1 truncate'>
                    <span className='block truncate'>{node.data.name}</span>
                </div>
            </div>
            <div className='flex flex-col gap-1 p-1'>
                {/* Transforms list */}
                <button
                    onClick={handleOpenParamsModal}
                    className="w-full flex items-center gap-2 p-2 rounded-sm hover:bg-muted text-left transition-colors"
                >
                    <Pencil className="h-4 w-4 opacity-60" /> Edit
                </button>
                <button
                    className="w-full flex items-center gap-2 p-2 rounded-sm hover:bg-muted text-left transition-colors"
                >
                    <Trash className="h-4 w-4 text-red-500 opacity-60" /> Delete
                </button>
            </div>
        </BaseContextMenu >
    );
}