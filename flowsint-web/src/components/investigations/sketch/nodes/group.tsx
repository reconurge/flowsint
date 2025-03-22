import { memo } from "react";

import { NodeProps } from "@xyflow/react";
import { GroupNode } from "@/components/ui/group-node";

const Group = memo(({ selected, data }: NodeProps) => {
    return <GroupNode selected={selected} label={data.label as string} />;
});

export default Group;