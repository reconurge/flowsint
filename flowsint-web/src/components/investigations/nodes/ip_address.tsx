import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CopyButton } from '@/components/copy';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AtSignIcon, LocateIcon } from 'lucide-react';

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
          "border hover:border-primary rounded-full p-0 shadow-none backdrop-blur bg-background/40",
        )}
      >
        <div className="flex items-center gap-2 p-1">
          <Badge variant="secondary" className="h-6 w-6 p-0 rounded-full">
            <LocateIcon className="h-4 w-4" />
          </Badge>
          <div className="flex items-center gap-1">
            <span className="text-sm">{data.label}</span>
            <CopyButton className="rounded-full h-7 w-7 text-xs" content={data.label} />
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