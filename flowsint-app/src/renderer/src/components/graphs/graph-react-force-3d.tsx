import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { GraphEdge, GraphNode, useGraphStore } from '@/stores/graph-store';
import { useNodesDisplaySettings } from '@/stores/node-display-settings';
import { useGraphControls } from '@/stores/graph-controls-store';
import type { ItemType } from '@/stores/node-display-settings';
import EmptyState from './empty-state';
//@ts-ignore
import SpriteText from "https://esm.sh/three-spritetext";

interface GraphReactForce3DProps {
    style?: React.CSSProperties;
}

const GraphReactForce3D: React.FC<GraphReactForce3DProps> = () => {
    const nodes = useGraphStore(s => s.nodes) as GraphNode[];
    const edges = useGraphStore(s => s.edges) as GraphEdge[];
    const colors = useNodesDisplaySettings(s => s.colors) as Record<ItemType, string>;
    const toggleNodeSelection = useGraphStore(s => s.toggleNodeSelection);
    const clearSelectedNodes = useGraphStore(s => s.clearSelectedNodes);
    const setActions = useGraphControls(s => s.setActions);
    const getSize = useNodesDisplaySettings(s => s.getSize);
    const graphRef = useRef<any>();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const currentNode = useGraphStore(s => s.currentNode);

    // Cache pour les sprites de texte des liens
    const linkSpritesCache = useRef<Map<string, any>>(new Map());

    // Mémoriser les données du graphique pour éviter les re-rendus
    const graphData = useMemo(() => ({
        nodes,
        links: edges
    }), [nodes, edges]);

    // Mémoriser les fonctions de couleur et de taille pour éviter les recalculs
    const nodeColorFunction = useCallback((node: GraphNode) => {
        return colors[node.data.type];
    }, [colors]);

    const nodeValueFunction = useCallback((node: GraphNode) => {
        return getSize(node.data.type as ItemType) / 4;
    }, [getSize]);

    // Optimisation des sprites de texte des liens avec cache
    const linkThreeObjectFunction = useCallback((link: GraphEdge) => {
        const cacheKey = `${link.source}-${link.target}-${link.label}`;
        
        if (linkSpritesCache.current.has(cacheKey)) {
            return linkSpritesCache.current.get(cacheKey);
        }

        const sprite = new SpriteText(`${link.label}`);
        sprite.color = 'lightgrey';
        sprite.textHeight = 1.5;
        
        linkSpritesCache.current.set(cacheKey, sprite);
        return sprite;
    }, []);

    // Nettoyer le cache quand les liens changent
    useEffect(() => {
        linkSpritesCache.current.clear();
    }, [edges]);

    const handleNodeClick = useCallback((node: any) => {
        toggleNodeSelection(node, false);
        const distance = 130;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

        graphRef.current?.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node,
            500
        );
    }, [toggleNodeSelection]);

    useEffect(() => {
        if (currentNode) {
            handleNodeClick(currentNode);
        }
    }, [currentNode, handleNodeClick]);

    const handleBackgroundClick = useCallback(() => {
        clearSelectedNodes();
    }, [clearSelectedNodes]);

    const handleZoomIn = useCallback((graph: any) => {
        const distance = graph.cameraDistance();
        graph.cameraDistance(distance * 0.75);
    }, []);

    const handleZoomOut = useCallback((graph: any) => {
        const distance = graph.cameraDistance();
        graph.cameraDistance(distance * 1.25);
    }, []);

    const handleFit = useCallback((graph: any) => {
        graph.zoomToFit(400);
    }, []);

    // Set actions in store
    useEffect(() => {
        setActions({
            zoomIn: () => handleZoomIn(graphRef.current),
            zoomOut: () => handleZoomOut(graphRef.current),
            zoomToFit: () => handleFit(graphRef.current),
        });
    }, [setActions, handleZoomIn, handleZoomOut, handleFit]);

    // Handle container resize avec debouncing
    useEffect(() => {
        if (!containerRef.current) return;

        let timeoutId: NodeJS.Timeout;
        const resizeObserver = new ResizeObserver(entries => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
                if (graphRef.current) {
                    graphRef.current.d3ReheatSimulation();
                }
            }, 100); // Debounce de 100ms
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            clearTimeout(timeoutId);
            resizeObserver.disconnect();
        };
    }, []);

    if (!nodes.length) {
        return <EmptyState />;
    }

    return (
        <div className="relative h-full grow w-full bg-background">
            <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300 }}>
                <ForceGraph3D
                    ref={graphRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    nodeLabel="label"
                    nodeColor={nodeColorFunction}
                    nodeRelSize={6}
                    nodeVal={nodeValueFunction}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    // Optimisations de performance
                    cooldownTicks={50} // Réduit de 100 à 50
                    d3AlphaDecay={0.05} // Augmenté de 0.02 à 0.05 pour convergence plus rapide
                    d3VelocityDecay={0.4} // Augmenté de 0.3 à 0.4
                    d3AlphaMin={0.01} // Ajouter un seuil minimum
                    // Réduire la fréquence de rendu
                    rendererConfig={{
                        antialias: false, // Désactiver l'antialiasing pour de meilleures performances
                        powerPreference: "high-performance"
                    }}
                    // Optimisations pour les gros graphiques
                    numDimensions={3}
                    enablePointerInteraction={true}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={handleBackgroundClick}
                    linkCurvature={link => link.curve}
                    backgroundColor="#00000000"
                    enableNodeDrag={true}
                    enableNavigationControls={true}
                    // Optimiser les sprites de texte
                    linkThreeObjectExtend={true}
                    linkThreeObject={linkThreeObjectFunction}
                    showNavInfo={false}
                    // Limiter la distance de rendu pour de meilleures performances
                    nodeOpacity={0.9}
                    linkOpacity={0.6}
                />
            </div>
        </div>
    );
};

export default GraphReactForce3D;