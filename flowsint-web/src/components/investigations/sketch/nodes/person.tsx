import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CopyButton } from '@/components/copy';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BaseNode } from "@/components/ui/base-node";

export default memo(({ data, selected }: any) => {
    return (
        <BaseNode selected={selected}>
            <div className="flex gap-2 items-center rounded-full">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={data?.image_url} alt={data.full_name} />
                    <AvatarFallback>{data.full_name[0]}</AvatarFallback>
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