import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import Dagre from '@dagrejs/dagre';
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

export const getForceLayoutedElements = (
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

export const getDagreLayoutedElements = (nodes: AppNode[],
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

export const nodesTypes = {
  // Types existants
  emails: { table: "emails", type: "email", fields: ["email"] },
  individuals: { table: "individuals", type: "individual", fields: ["full_name"] },
  phone_numbers: { table: "phone_numbers", type: "phone", fields: ["phone_number"] },
  ip_addresses: { table: "ip_addresses", type: "ip", fields: ["ip_address"] },
  social_accounts_facebook: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:facebook"],
  },
  social_accounts_instagram: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:instagram"],
  },
  social_accounts_telegram: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:telegram"],
  },
  social_accounts_snapchat: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:snapchat"],
  },
  social_accounts_signal: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:signal"],
  },
  social_accounts_github: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:github"],
  },
  physical_addresses: { table: "physical_addresses", type: "address", fields: ["address", "city", "country", "zip"] },
  vehicles_car: {
    table: "vehicles",
    type: "vehicle",
    fields: ["plate", "model", "year", "brand", "type:car"],
  },
  vehicles_motorcycle: {
    table: "vehicles",
    type: "vehicle",
    fields: ["plate", "model", "year", "brand", "type:motorcycle"],
  },
  vehicles_boat: {
    table: "vehicles",
    type: "vehicle",
    fields: ["plate", "model", "year", "brand", "type:boat"],
  },

  // Nouveaux réseaux sociaux
  social_accounts_linkedin: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:linkedin"],
  },
  social_accounts_twitter: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:twitter"],
  },
  social_accounts_tiktok: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:tiktok"],
  },
  social_accounts_reddit: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:reddit"],
  },
  social_accounts_discord: {
    table: "social_accounts",
    type: "social",
    fields: ["profile_url", "username", "platform:discord"],
  },

  // Nouveaux types de véhicules
  vehicles_aircraft: {
    table: "vehicles",
    type: "vehicle",
    fields: ["registration", "model", "year", "manufacturer", "type:aircraft"],
  },

  // Organisation
  organizations: {
    table: "organizations",
    type: "organization",
    fields: ["name", "registration_number", "founding_date"],
  },

  // Site web
  websites: {
    table: "websites",
    type: "website",
    fields: ["url", "registration_date", "registrar", "ip_address"],
  },

  // Document
  documents: {
    table: "documents",
    type: "document",
    fields: ["title", "author", "creation_date", "file_hash", "file_type"],
  },

  // Finances
  crypto_wallets: {
    table: "crypto_wallets",
    type: "financial",
    fields: ["address", "currency", "platform"],
  },
  bank_accounts: {
    table: "bank_accounts",
    type: "financial",
    fields: ["account_number", "bank_name", "iban", "bic"],
  },
  transactions: {
    table: "transactions",
    type: "financial",
    fields: ["amount", "date", "sender", "recipient", "currency"],
  },

  // Événements
  events: {
    table: "events",
    type: "event",
    fields: ["name", "date", "location", "description", "participants"],
  },

  // Appareils
  devices_phone: {
    table: "devices",
    type: "device",
    fields: ["imei", "model", "manufacturer", "serial_number", "type:phone"],
  },
  devices_computer: {
    table: "devices",
    type: "device",
    fields: ["mac_address", "model", "manufacturer", "serial_number", "type:computer"],
  },
  devices_tablet: {
    table: "devices",
    type: "device",
    fields: ["imei", "model", "manufacturer", "serial_number", "type:tablet"],
  },
  devices_iot: {
    table: "devices",
    type: "device",
    fields: ["mac_address", "model", "manufacturer", "serial_number", "type:iot"],
  },

  // Médias
  media: {
    table: "media",
    type: "media",
    fields: ["filename", "hash", "creation_date", "location", "exif_data"],
  },

  // Éducation
  education: {
    table: "education",
    type: "education",
    fields: ["institution", "degree", "field", "start_date", "end_date"],
  },

  // Relations
  relationships: {
    table: "relationships",
    type: "relationship",
    fields: ["type", "entity_a", "entity_b", "start_date", "end_date", "description"],
  },

  // Activités en ligne
  forum_posts: {
    table: "forum_posts",
    type: "online_activity",
    fields: ["forum", "username", "post_date", "post_content", "post_url", "type:forum_post"],
  },
  comments: {
    table: "comments",
    type: "online_activity",
    fields: ["platform", "username", "comment_date", "comment_content", "comment_url", "type:comment"],
  },
  online_purchases: {
    table: "online_purchases",
    type: "online_activity",
    fields: ["platform", "username", "purchase_date", "item", "price", "type:purchase"],
  },

  // Empreinte numérique
  digital_footprints: {
    table: "digital_footprints",
    type: "digital_footprint",
    fields: ["platform", "username", "date_discovered", "data_type", "source_url"],
  },

  // Données biométriques
  biometric_data: {
    table: "biometric_data",
    type: "biometric",
    fields: ["type", "identifier", "date_collected", "source"],
  },

  // Identifiants
  credentials: {
    table: "credentials",
    type: "credential",
    fields: ["service", "username", "hash", "breach_date", "breach_source"],
  },
}

export const typeColorMap: Record<string, string> = {
  individual: "rounded-full bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow-md dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 dark:shadow-slate-900/30",
  phone_number: "bg-sky-100 text-sky-800 hover:bg-sky-100/80 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/40",
  address: "bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/40",
  email: "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm dark:from-emerald-950 dark:to-emerald-900 dark:border-emerald-800 dark:shadow-emerald-900/30",
  ip_address: "bg-slate-100 text-slate-800 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800/60",
  social: "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm dark:from-purple-950 dark:to-purple-900 dark:border-purple-800 dark:shadow-purple-900/30",
  organization: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm dark:from-orange-950 dark:to-orange-900 dark:border-orange-800 dark:shadow-orange-900/30",
  vehicle: "bg-orange-100 text-orange-800 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/40",
  website: "bg-purple-100 text-purple-800 hover:bg-purple-100/80 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/40",
  document: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/40",
  financial: "bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/40",
  event: "bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/40",
  device: "bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40",
  media: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100/80 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/40",
  education: "bg-teal-100 text-teal-800 hover:bg-teal-100/80 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/40",
  relationship: "bg-rose-100 text-rose-800 hover:bg-rose-100/80 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/40",
  online_activity: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/40",
  digital_footprint: "bg-lime-100 text-lime-800 hover:bg-lime-100/80 dark:bg-lime-900/30 dark:text-lime-300 dark:hover:bg-lime-900/40",
  biometric: "bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/40",
  credential: "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/60",
}