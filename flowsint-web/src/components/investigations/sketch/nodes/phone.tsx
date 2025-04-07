import React, { memo } from 'react';
import { CopyButton } from '@/components/copy';
import { Badge } from '@/components/ui/badge';
import { PhoneIcon } from 'lucide-react';
import { BaseNode } from '@/components/ui/base-node';
import { Handle, Position } from '@xyflow/react';
import { cn, typeColorMap } from '@/lib/utils';

export default memo(({ data, selected }: any) => {
    return (
        <BaseNode className={cn('p-.5 rounded-full', "rounded-full bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200 shadow dark:from-sky-800 dark:to-sky-900 dark:border-sky-700 dark:shadow-sky-900/30")} selected={selected}>
            <div className="flex items-center gap-2 p-1">
                <Badge variant="secondary" className="h-6 w-6 p-0 rounded-full">
                    <PhoneIcon className="h-4 w-4" />
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