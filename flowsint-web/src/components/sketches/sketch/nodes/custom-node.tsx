import React, { memo, useMemo, useCallback } from 'react';
import { CopyButton } from '@/components/copy';
import { Badge } from '@/components/ui/badge';
import { Handle, Position } from '@xyflow/react';
import { cn, typeColorMap } from '@/lib/utils';
import { actionItems } from '@/lib/action-items';
import { QuestionMarkIcon } from '@radix-ui/react-icons';
import {
    TooltipNode,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip-node";
import { useSketchStore } from '@/store/sketch-store';
import { useFlowStore } from '@/store/flow-store';

export default memo(({ data, selected }: any) => {
    const item = useMemo(() => (actionItems as any).find((a: any) => a.type === data.type), [data?.type]);
    const Icon = item?.icon || QuestionMarkIcon;
    const showNodeLabel = useSketchStore(state => state.settings.showNodeLabel);
    const currentNodeId = useFlowStore(state => state.currentNode?.id,
        (prev, next) => prev === next);

    const active = currentNodeId === data.id;

    return (
        <TooltipNode className={cn('p-.5 rounded-full', typeColorMap[data.type])} selected={active}>
            <TooltipTrigger>
                <div className="inline-flex items-center gap-2 p-1 w-auto">
                    <Badge variant="secondary" className={cn("p-0 rounded-full", item?.size || "h-5 w-5")}>
                        <Icon className="h-4 w-4" />
                    </Badge>
                    {showNodeLabel && <div className="flex items-center gap-1">
                        <span className="text-sm">{data.label}</span>
                        <CopyButton className="rounded-full h-7 w-7 text-xs" content={data.label} />
                    </div>}
                </div>
            </TooltipTrigger>
            {!showNodeLabel &&
                <TooltipContent selected={active} position={Position.Top}>{data.label}<CopyButton className="h-6 w-6" content={data.label} /></TooltipContent>
            }
            <Handle
                type="target"
                style={{ visibility: "hidden" }}
                position={Position.Top}
                isConnectable={false}
            />
            <Handle
                type="source"
                style={{ visibility: "hidden" }}
                position={Position.Bottom}
                isConnectable={false}
            />
        </TooltipNode>
    );
});