import { CustomEdge } from "@/components/xyflow/custom-edge";
import { memo } from "react";
import { EdgeProps } from "@xyflow/react";

const CustomEdgeLabel = memo((props: EdgeProps) => {
    return (
        <CustomEdge {...props}>
            <span className="block text-[9px] opacity-70 uppercase">
                {props.label}
            </span>
        </CustomEdge>
    );
});

// Add display name for debugging
CustomEdgeLabel.displayName = 'CustomEdgeLabel';

export default CustomEdgeLabel;