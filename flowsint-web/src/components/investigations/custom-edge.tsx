"use client"

import { useMemo, memo } from "react"
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, type EdgeProps } from "@xyflow/react"
import { useInvestigationStore } from "@/store/investigation-store"
import { Badge } from "@/components/ui/badge"

// Define proper types for the component props
interface CustomEdgeProps extends EdgeProps {
    label?: string
    confidence_level?: number
}

// Predefined styles to avoid object creation on each render
const getBadgeStyle = (labelX: number, labelY: number, opacity = 1) => ({
    position: "absolute" as const,
    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
    pointerEvents: "all" as const,
    opacity,
})

// Memoize the component to prevent unnecessary re-renders
const CustomEdge = memo(
    ({ id, label, confidence_level, sourceX, sourceY, targetX, targetY, style }: CustomEdgeProps) => {
        // Only access the specific part of the store that's needed
        const showEdgeLabel = useInvestigationStore((state) => state.settings.showEdgeLabel)

        // Memoize the path calculation to avoid recalculating on every render
        const [edgePath, labelX, labelY] = useMemo(
            () =>
                getSmoothStepPath({
                    sourceX,
                    sourceY,
                    targetX,
                    targetY,
                }),
            [sourceX, sourceY, targetX, targetY],
        )

        // Memoize the badge style to avoid creating a new object on every render
        const badgeStyle = useMemo(
            () => getBadgeStyle(labelX, labelY, typeof style?.opacity === 'number' ? style.opacity : 1),
            [labelX, labelY, style?.opacity],
        )

        // Determine badge color once
        const badgeColor = label === "relation" ? "orange" : "blue"

        return (
            <>
                <BaseEdge id={id} path={edgePath} style={style} />
                {showEdgeLabel && (
                    <EdgeLabelRenderer>
                        <Badge variant={label === "relation" ? "default" : "outline"} color={badgeColor} style={badgeStyle} className="nodrag nopan text-xs px-1">
                            {label}
                            {confidence_level != null && ` ${confidence_level}%`}
                        </Badge>
                    </EdgeLabelRenderer>
                )}
            </>
        )
    },
    // Custom comparison function to prevent unnecessary re-renders
    (prevProps, nextProps) => {
        // Only re-render if these props change
        return (
            prevProps.sourceX === nextProps.sourceX &&
            prevProps.sourceY === nextProps.sourceY &&
            prevProps.targetX === nextProps.targetX &&
            prevProps.targetY === nextProps.targetY &&
            prevProps.label === nextProps.label &&
            prevProps.confidence_level === nextProps.confidence_level &&
            prevProps.style?.opacity === nextProps.style?.opacity
        )
    },
)

// Add display name for debugging
CustomEdge.displayName = "CustomEdge"

export default CustomEdge

