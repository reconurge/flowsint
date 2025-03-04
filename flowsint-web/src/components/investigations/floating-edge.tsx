"use client"

import { memo, useMemo } from "react"
import { getEdgeParams } from "@/lib/utils"
import { EdgeLabelRenderer, getSmoothStepPath, getStraightPath, useInternalNode } from "@xyflow/react"
import { useInvestigationStore } from "@/store/investigation-store"
import { Badge } from "@/components/ui/badge"

function FloatingEdge({
    id,
    source,
    target,
    markerEnd,
    label,
    confidence_level,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
}: any) {
    const sourceNode = useInternalNode(source)
    const targetNode = useInternalNode(target)
    const { settings } = useInvestigationStore()

    // Si les nœuds source ou cible n'existent pas, on ne rend rien
    if (!sourceNode || !targetNode) {
        return null
    }

    // Mémorisation des paramètres de l'arête
    const edgeParameters = useMemo(() => {
        return getEdgeParams(sourceNode, targetNode)
    }, [sourceNode, targetNode])

    // Mémorisation du calcul du chemin et des coordonnées du label
    const pathData = useMemo(() => {
        const { sx, sy, tx, ty } = edgeParameters
        return getStraightPath({
            sourceX: sx,
            sourceY: sy,
            targetX: tx,
            targetY: ty,
        })
    }, [edgeParameters])

    // Mémorisation du style du badge
    const badgeStyle = useMemo(
        () => ({
            position: "absolute" as const,
            transform: `translate(-50%, -50%) translate(${pathData[1]}px,${pathData[2]}px)`,
            pointerEvents: "all" as const,
            opacity: style?.opacity || 1,
        }),
        [pathData, style?.opacity],
    )

    // Mémorisation du contenu du badge
    const badgeContent = useMemo(
        () => (
            <>
                {label} {confidence_level && <>{confidence_level}%</>}
            </>
        ),
        [label, confidence_level],
    )

    // Mémorisation du badge complet
    const edgeLabel = useMemo(() => {
        let labelElement = null
        if (settings.showEdgeLabel) {
            labelElement = (
                <Badge
                    color={label === "relation" ? "orange" : "blue"}
                    style={badgeStyle}
                    className="nodrag nopan bg-primary/80 backdrop-blur leading-3.5 border border-primary !text-[.6rem] !px-1 !py-0"
                >
                    {badgeContent}
                </Badge>
            )
        }
        return labelElement
    }, [settings.showEdgeLabel, label, badgeStyle, badgeContent])

    return (
        <>
            <path id={id} className="react-flow__edge-path" d={pathData[0]} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>{edgeLabel}</EdgeLabelRenderer>
        </>
    )
}

// Fonction de comparaison personnalisée pour memo
function arePropsEqual(prevProps: any, nextProps: any) {
    return (
        prevProps.id === nextProps.id &&
        prevProps.source === nextProps.source &&
        prevProps.target === nextProps.target &&
        prevProps.label === nextProps.label &&
        prevProps.confidence_level === nextProps.confidence_level &&
        prevProps.style?.opacity === nextProps.style?.opacity &&
        prevProps.sourceX === nextProps.sourceX &&
        prevProps.sourceY === nextProps.sourceY &&
        prevProps.targetX === nextProps.targetX &&
        prevProps.targetY === nextProps.targetY
    )
}

// Export du composant mémorisé
export default memo(FloatingEdge, arePropsEqual)

