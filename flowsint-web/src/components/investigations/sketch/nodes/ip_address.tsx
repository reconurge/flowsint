import React, { memo } from 'react';
import { CopyButton } from '@/components/copy';
import { Badge } from '@/components/ui/badge';
import { LocateIcon } from 'lucide-react';
import { BaseNode } from '@/components/ui/base-node';
import { Handle, Position } from '@xyflow/react';
import { cn, typeColorMap } from '@/lib/utils';

export default memo(({ data, selected }: any) => {
  return (
    <BaseNode className={cn('p-.5 rounded-full', typeColorMap["ip_address"])} selected={selected}>
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