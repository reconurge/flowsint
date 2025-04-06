import React, { memo } from 'react';
import { CopyButton } from '@/components/copy';
import { Badge } from '@/components/ui/badge';
import { LocateIcon } from 'lucide-react';
import { BaseNode } from '@/components/ui/base-node';
import { Handle, Position } from '@xyflow/react';
import { cn, typeColorMap } from '@/lib/utils';

export default memo(({ data, selected }: any) => {
  return (
    <BaseNode className={cn('p-.5 rounded-full', "bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 shadow-md dark:from-pink-800 dark:to-pink-900 dark:border-pink-700 dark:shadow-pink-900/30",
    )} selected={selected}>
      <div className="flex items-center gap-2 p-1">
        <Badge variant="secondary" className="h-6 w-6 p-0 rounded-full">
          <LocateIcon className="h-4 w-4" />
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