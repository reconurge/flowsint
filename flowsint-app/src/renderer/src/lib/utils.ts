import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import Dagre from '@dagrejs/dagre';
import { actionItems } from "./action-items"
import type { ActionItem, FormField } from "./action-items"
import { type Edge, Position, type Node } from '@xyflow/react';
import * as d3 from "d3-force"

interface NodePosition {
  x: number;
  y: number;
}

interface NodeMeasured {
  width: number;
  height: number;
}

interface NodeInternals {
  positionAbsolute: NodePosition;
}

interface FlowNode {
  measured: NodeMeasured;
  internals: NodeInternals;
}

interface IntersectionPoint {
  x: number;
  y: number;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const zoomSelector = (s: { transform: number[]; }) => s.transform[2] >= 0.6;


// this helper function returns the intersection point
// of the line between the center of the intersectionNode and the target node
function getNodeIntersection(
  intersectionNode: FlowNode,
  targetNode: FlowNode
): IntersectionPoint {
  const { width: intersectionNodeWidth, height: intersectionNodeHeight } = intersectionNode.measured;
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
function getEdgePosition(node: FlowNode, intersectionPoint: IntersectionPoint): Position {
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
interface EdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
}

export function getEdgeParams(source: FlowNode, target: FlowNode): EdgeParams {
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

interface LayoutOptions {
  direction?: "LR" | "TB";
  strength?: number;
  distance?: number;
  iterations?: number;
}

export const getForceLayoutedElements = (
  nodes: Node[],
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

export const getDagreLayoutedElements = (nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {
    direction: "TB",
    strength: -300,
    distance: 100,
    iterations: 300,
  },) => {

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: options.direction });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      targetPosition: options.direction === "LR" ? 'left' : 'top',
      sourcePosition: options.direction === "LR" ? 'right' : 'bottom',
      width: node.measured?.width ?? 0,
      height: node.measured?.height ?? 0,
    }),
  );

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const position = g.node(node.id);
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      const x = position.x - (node.measured?.width ?? 0) / 2;
      const y = position.y - (node.measured?.height ?? 0) / 2;

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};


export const sanitize = (name: string) => {
  return name
    .normalize("NFKD") // Decompose special characters (e.g., accents)
    .replace(/[\u0300-\u036f]/g, "") // Remove accent marks
    .replace(/[^a-zA-Z0-9.\-_]/g, "_") // Replace invalid characters with underscores
    .replace(/_{2,}/g, "_") // Replace multiple underscores with a single one
    .replace(/^_|_$/g, "") // Trim leading or trailing underscores
    .toLowerCase(); // Convert to lowercase for consistency
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B"
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
  else return (bytes / 1048576).toFixed(1) + " MB"
}


function convertFieldToSimpleFormat(field: FormField): string {
  if ((field.type === "hidden" && field.name === "platform") || field.name === "type") {
    const defaultValue = field.options?.[0]?.value || ""
    if (defaultValue) {
      return `${field.name}:${defaultValue}`
    }
  }
  return field.name
}

export function generateNodeTypes() {
  const nodeTypes: Record<string, { table: string; type: string; fields: string[] }> = {}

  function processItems(items: ActionItem[]) {
    items.forEach((item) => {
      if (item.table && !item.disabled) {
        nodeTypes[item.key] = {
          table: item.table,
          type: item.type,
          fields: item.fields.map(convertFieldToSimpleFormat),
        }
      }

      // Traiter les enfants récursivement
      if (item.children && item.children.length > 0) {
        processItems(item.children)
      }
    })
  }

  processItems(actionItems)
  return nodeTypes
}

export const nodesTypes = generateNodeTypes()

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)
}


export function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}


export const flattenObj = (ob: Record<string, any>) => {

  let result: Record<string, any> = {};
  for (const i in ob) {
    if (ob[i] && typeof ob[i] === 'object' && !Array.isArray(ob[i])) {
      const temp = flattenObj(ob[i]);
      for (const j in temp) {
        result[i + '.' + j] = temp[j];
      }
    }
    else {
      result[i] = ob[i];
    }
  }
  return result;
}

interface FlattenableNode {
  [key: string]: unknown;
  children?: FlattenableNode[];
}

export function flattenArray<T extends FlattenableNode>(nodes: T[], key: string): Omit<T, typeof key>[] {
  let result: Omit<T, typeof key>[] = [];

  for (const node of nodes) {
    const { [key]: children, ...rest } = node;
    result.push(rest as Omit<T, typeof key>);
    if (children) {
      result = result.concat(flattenArray(children as T[], key));
    }
  }
  return result;
}


export function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}