import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
//@ts-ignore
import * as d3 from "d3-force"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const zoomSelector = (s: { transform: number[]; }) => s.transform[2] >= 0.6;

import { Position, MarkerType } from '@xyflow/react';
import { AppNode } from "@/store/flow-store";

// this helper function returns the intersection point
// of the line between the center of the intersectionNode and the target node
function getNodeIntersection(intersectionNode: { measured: { width: any; height: any; }; internals: { positionAbsolute: any; }; }, targetNode: { internals: { positionAbsolute: any; }; measured: { width: number; height: number; }; }) {
  // https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
  const { width: intersectionNodeWidth, height: intersectionNodeHeight } =
    intersectionNode.measured;
  const intersectionNodePosition = intersectionNode.internals.positionAbsolute;
  const targetPosition = targetNode.internals.positionAbsolute;

  const w = intersectionNodeWidth / 2;
  const h = intersectionNodeHeight / 2;

  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 = targetPosition.x + targetNode.measured.width / 2;
  const y1 = targetPosition.y + targetNode.measured.height / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

// returns the position (top,right,bottom or right) passed node compared to the intersection point
function getEdgePosition(node: { internals: { positionAbsolute: any; }; }, intersectionPoint: { x: any; y: any; }) {
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + n.measured.width - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= n.y + n.measured.height - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
export function getEdgeParams(source: any, target: any) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}

export function initialElements() {
  const nodes = [];
  const edges = [];
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  nodes.push({ id: 'target', data: { label: 'Target' }, position: center });

  for (let i = 0; i < 8; i++) {
    const degrees = i * (360 / 8);
    const radians = degrees * (Math.PI / 180);
    const x = 250 * Math.cos(radians) + center.x;
    const y = 250 * Math.sin(radians) + center.y;

    nodes.push({ id: `${i}`, data: { label: 'Source' }, position: { x, y } });

    edges.push({
      id: `edge-${i}`,
      target: 'target',
      source: `${i}`,
      type: 'floating',
      markerEnd: {
        type: MarkerType.Arrow,
      },
    });
  }

  return { nodes, edges };
}

interface Node {
  id: string
  position?: { x: number; y: number }
  measured?: { width: number; height: number }
  [key: string]: any
}

interface Edge {
  source: string
  target: string
  [key: string]: any
}

interface LayoutOptions {
  direction?: string
  strength?: number
  distance?: number
  iterations?: number
}

export const getLayoutedElements = (
  nodes: AppNode[],
  edges: Edge[],
  options: LayoutOptions = {
    direction: "LR",
    strength: -300,
    distance: 100,
    iterations: 300,
  },
) => {
  // Create a map of node IDs to indices for the simulation
  const nodeMap = new Map(nodes.map((node, i) => [node.id, i]))

  // Create a copy of nodes with positions for the simulation
  const nodesCopy = nodes.map((node) => ({
    ...node,
    x: node.position?.x || Math.random() * 500,
    y: node.position?.y || Math.random() * 500,
    width: node.measured?.width || 0,
    height: node.measured?.height || 0,
  }))

  // Create links for the simulation using indices
  const links = edges.map((edge) => ({
    source: nodeMap.get(edge.source),
    target: nodeMap.get(edge.target),
    original: edge,
  }))

  // Create the simulation
  const simulation = d3
    .forceSimulation(nodesCopy)
    .force(
      "link",
      d3.forceLink(links).id((d: any) => nodeMap.get(d.id)),
    )
    .force("charge", d3.forceManyBody().strength(options.strength || -300))
    .force("center", d3.forceCenter(250, 250))
    .force(
      "collision",
      d3.forceCollide().radius((d: any) => Math.max(d.width, d.height) / 2 + 10),
    )

  // If direction is horizontal, adjust forces
  if (options.direction === "LR") {
    simulation.force("x", d3.forceX(250).strength(0.1))
    simulation.force("y", d3.forceY(250).strength(0.05))
  } else {
    simulation.force("x", d3.forceX(250).strength(0.05))
    simulation.force("y", d3.forceY(250).strength(0.1))
  }

  // Run the simulation synchronously
  simulation.stop()
  for (let i = 0; i < (options.iterations || 300); i++) {
    simulation.tick()
  }

  // Update node positions based on simulation results
  const updatedNodes = nodesCopy.map((node) => ({
    ...node,
    position: {
      x: node.x - node.width / 2,
      y: node.y - node.height / 2,
    },
  }))

  return {
    nodes: updatedNodes,
    edges,
  }
}

export default getLayoutedElements


export const sanitize = (name: string) => {
  return name
    .normalize("NFKD") // Decompose special characters (e.g., accents)
    .replace(/[\u0300-\u036f]/g, "") // Remove accent marks
    .replace(/[^a-zA-Z0-9.\-_]/g, "_") // Replace invalid characters with underscores
    .replace(/_{2,}/g, "_") // Replace multiple underscores with a single one
    .replace(/^_|_$/g, "") // Trim leading or trailing underscores
    .toLowerCase(); // Convert to lowercase for consistency
};