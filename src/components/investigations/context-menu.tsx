import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

export default function ContextMenu({
    id,
    top,
    left,
    right,
    bottom,
    ...props
}: any) {
    const { getNode, setNodes, addNodes, setEdges } = useReactFlow();
    const duplicateNode = useCallback(() => {
        const node = getNode(id);
        if (!node) return
        const position = {
            x: node.position.x + 50,
            y: node.position.y + 50,
        };

        addNodes({
            ...node,
            selected: false,
            dragging: false,
            id: `${node.id}-copy`,
            position,
        });
    }, [id, getNode, addNodes]);

    const deleteNode = useCallback(() => {
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
        setEdges((edges) => edges.filter((edge) => edge.source !== id));
    }, [id, setNodes, setEdges]);

    return (
        <div
            style={{ top, left, right, bottom }}
            className="absolute"
            {...props}
        >
            <button onClick={duplicateNode}>duplicate</button>
            <button onClick={deleteNode}>delete</button>
        </div>
    );
}