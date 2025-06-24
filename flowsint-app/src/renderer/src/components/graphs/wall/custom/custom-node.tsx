import { memo, useCallback } from "react";
import { NodeProps, Handle, Position, getOutgoers } from "@xyflow/react";
import { useNodesDisplaySettings } from "@/stores/node-display-settings";
import { useGraphStore } from "@/stores/graph-store";
import { ChevronDown, ChevronRight } from "lucide-react";

const size = 32;


export const CustomNode = memo(({ data, selected, id }: NodeProps) => {
    const iconUrl = `/icons/${data.type}.svg`;
    const isCurrent = useGraphStore(state => state.isCurrent);
    const color = useNodesDisplaySettings(state => state.colors[data.type as keyof typeof state.colors]);
    const node = useGraphStore(state => state.nodes.find(n => n.id === id));
    const edges = useGraphStore(state => state.edges);
    const toggleCollapse = useGraphStore(state => state.toggleCollapse);

    const isCollapsed = node?.collapsed;

    const outgoers = node ? getOutgoers(
        { id },
        [node],
        edges,
    ) : [];

    const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        toggleCollapse(id);
    }, [id, toggleCollapse]);

    return (
        <div className="xy-node -z-[5000] relative p-1 flex flex-col justify-center items-center !rounded-full h-20">
            {outgoers.length > 0 &&
                <button
                    onClick={handleToggleCollapse}
                    style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        zIndex: 10,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                    }}
                    tabIndex={-1}
                    aria-label={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>}
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
            <div style={{ width: size, height: size, borderColor: (selected || isCurrent(id)) ? "#f97316" : color }} className="!rounded-full gap-0 flex items-center justify-center border-2 border-primary/70 p-1 overflow-hidden">
                <img
                    src={iconUrl}
                    alt={data?.label as string ?? "N/A"}
                    width={size}
                    height={size}
                    draggable={false}
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
