import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CopyButton } from '@/components/copy';
import { Badge } from '@/components/ui/badge';
import { usePlatformIcons } from '@/lib/hooks/use-platform-icons';
import { BaseNode } from '@/components/ui/base-node';

export default memo(({ data, selected }: any) => {
    const platformsIcons = usePlatformIcons()
    const platformIcon = useMemo(() => {
        // @ts-ignore
        return platformsIcons?.[data?.platform]?.icon
    }, [platformsIcons, data?.platform])
    return (
        <BaseNode className='p-.5 rounded-full' selected={selected}>
            <div className="flex items-center gap-2 p-1">
                <Badge variant="secondary" className="h-6 w-6 p-0 rounded-full">
                    {platformIcon}
                </Badge>
                <div className="flex items-center gap-1">
                    <span className="text-sm">{data.username || data.profile_url}</span>
                    <CopyButton className="rounded-full h-7 w-7 text-xs" content={data.username || data.profile_url} />
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