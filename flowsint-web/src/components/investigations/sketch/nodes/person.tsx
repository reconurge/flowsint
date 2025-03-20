import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CopyButton } from '@/components/copy';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default memo(({ data }: any) => {
    return (
        <>
            <Handle
                type="target"
                position={Position.Top}
                className={cn("w-16 bg-teal-500 opacity-0")}
            />
            <Card
                className={cn(
                    "p-1 border border-border hover:border-primary duration-100 rounded-lg shadow-none backdrop-blur bg-background/40",
                )}
            >
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
            </Card>
            <Handle
                type="source"
                position={Position.Bottom}
                className={cn("w-16 bg-teal-500 opacity-0")}
            />
        </>
    );
});