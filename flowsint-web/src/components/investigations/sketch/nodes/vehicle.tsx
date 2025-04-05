import React, { memo } from 'react';
import { CopyButton } from '@/components/copy';
import { Badge } from '@/components/ui/badge';
import { CarIcon, PhoneIcon } from 'lucide-react';
import { BaseNode } from '@/components/ui/base-node';
import { Handle, Position } from '@xyflow/react';
import { cn, typeColorMap } from '@/lib/utils';

export default memo(({ data, selected }: any) => {
    return (
        <BaseNode className={cn('p-.5 rounded-full', "bg-orange-100 text-orange-800 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/40")} selected={selected}>
            <div className="flex items-center gap-2 p-1">
                <Badge variant="secondary" className="h-6 w-6 p-0 rounded-full">
                    <CarIcon className="h-4 w-4" />
                </Badge>
                <div className="flex items-center gap-1">
                    <span className="text-sm">{data.label}</span>
                    <CopyButton className="rounded-full h-7 w-7 text-xs" content={data.label} />
                </div>
            </div>
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
        </BaseNode>
    );
});