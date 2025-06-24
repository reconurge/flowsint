import { memo } from "react";
import { NodeProps, Handle, Position } from "@xyflow/react";
import { useNodesDisplaySettings } from "@/stores/node-display-settings";
import { useGraphStore } from "@/stores/graph-store";
import { useIcon } from "@/hooks/use-icon";

const size = 32;


export const CustomNode = memo(({ data, selected, id }: NodeProps) => {
    const isCurrent = useGraphStore(state => state.isCurrent);
    const color = useNodesDisplaySettings(state => state.colors[data.type as keyof typeof state.colors]);
    const IconComponent = useIcon(data.type as string);


    return (
        <div className="xy-node -z-[5000] relative p-1 flex flex-col justify-center items-center !rounded-full h-20">
            <Handle
                type="target"
                position={Position.Top}
                id="top"
                className="opacity-0"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                className="opacity-0"
            />
            <Handle
                type="source"
                position={Position.Left}
                id="left"
                className="opacity-0"
            />
            <Handle
                type="target"
                position={Position.Right}
                id="right"
                className="opacity-0"
            />
            <div style={{ width: size, height: size, borderColor: (selected || isCurrent(id)) ? "#f97316" : color }} className="!rounded-full gap-0 flex items-center justify-center border-primary/70 p-1 overflow-hidden">
                <IconComponent
                    size={size}
                    style={{
                        pointerEvents: "none",
                        opacity: selected ? 1 : 0.85,
                        display: "block",
                        margin: "0 auto",
                    }}
                />
            </div>
            <div
                className="text-nowrap text-center truncate text-ellipsis"
                style={{
                    fontSize: 11,
                    color: (selected || isCurrent(id)) ? "#f97316" : "#94a3b8",
                    marginTop: 2,
                    pointerEvents: "none",
                }}
            >
                {data?.label as string ?? "N/A"}
            </div>
            <div
                className="text-nowrap text-center opacity-70"
                style={{
                    fontSize: 8,
                    color: selected ? "#f97316" : "#94a3b8",
                    marginTop: 1,
                    pointerEvents: "none",
                }}
            >
                {data?.type as string ?? "N/A"}
            </div>
        </div>
    );
});
