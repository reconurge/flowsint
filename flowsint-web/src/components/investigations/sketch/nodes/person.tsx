import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CopyButton } from '@/components/copy';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { BaseNode } from "@/components/ui/base-node";
import { UserIcon } from 'lucide-react';
import { cn, typeColorMap } from '@/lib/utils';

export default memo(({ data, selected }: any) => {
    return (
        <BaseNode selected={selected} className={cn('p-1 rounded-full', "rounded-full bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 dark:shadow-slate-900/30")} >
            <div className="flex gap-2 items-center rounded-full">
                <Avatar className="h-9 w-9 flex items-center justify-center dark:bg-slate-900 bg-slate-200">
                    <AvatarImage src={data?.image_url} alt={data.full_name} />
                    <UserIcon className="h-4 w-4 opacity-60" />
                </Avatar>
                <div className="flex items-center gap-1">
                    <span className="text-sm text-nowrap">{data.full_name}</span>
                    <CopyButton className="rounded-full" content={data.full_name} />
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