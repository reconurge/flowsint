import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CopyButton } from '@/components/copy';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { BaseNode } from "@/components/ui/base-node";
import { UserIcon } from 'lucide-react';

export default memo(({ data, selected }: any) => {
    return (
        <BaseNode selected={selected}>
            <div className="flex gap-2 items-center rounded-full">
                <Avatar className="h-9 w-9 flex items-center justify-center">
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