import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CopyButton } from '@/components/copy';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AtSignIcon } from 'lucide-react';
import { usePlatformIcons } from '@/lib/hooks/use-platform-icons';

export default memo(({ data }: any) => {
    const platformsIcons = usePlatformIcons()
    const platformIcon = useMemo(() => {
        // @ts-ignore
        return platformsIcons?.[data?.platform]?.icon
    }, [platformsIcons, data?.platform])
    return (
        <>
            <Handle
                type="target"
                position={Position.Top}
                className={cn("w-16 bg-teal-500 opacity-0")}
            />
            <Card
                className={cn(
                    "border hover:border-primary rounded-full p-0 shadow-none backdrop-blur bg-background/40",
                )}
            >
                <div className="flex items-center gap-2 p-1">
                    <Badge variant="secondary" className="h-6 w-6 p-0 rounded-full">
                        {platformIcon}
                    </Badge>
                    <div className="flex items-center gap-1">
                        <span className="text-sm">{data.username || data.profile_url}</span>
                        <CopyButton className="rounded-full h-7 w-7 text-xs" content={data.username || data.profile_url} />
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