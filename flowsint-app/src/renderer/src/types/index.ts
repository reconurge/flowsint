import { GraphEdge, GraphNode } from "@/stores/graph-store";
import type { Edge, Node } from "@xyflow/react";
import { type SVGProps } from "react";

export enum EventLevel {
  // Standard log levels
  INFO = "INFO",
  WARNING = "WARNING",
  FAILED = "FAILED",
  SUCCESS = "SUCCESS",
  DEBUG = "DEBUG",
  // Scanner-specific statuses
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  GRAPH_APPEND = "GRAPH_APPEND",
}

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type NodeData = {
  id: string;
  type: string,
  caption: string,
  label: string,
  created_at: string,
  // Allow any other properties
  [key: string]: any;
};

export type EdgeData = {
  // source: string;
  // target: string;
  from: string,
  to: string,
  date: string,
  id: string;
  label: string;
  type: string,
  confidence_level?: number | string
};

export type InvestigationGraph = {
  nodes: Node[];
  edges: Edge[];
};


export interface Tool {
  name: string
  path: string
  description?: string,
  active: boolean
  link?: string
  avatar?: string
  apiKeyRequired?: false | "free" | "paid"
}

export interface ToolCategory {
  [key: string]: {
    [key: string]: Tool
  }
}

export interface Tools {
  [key: string]: ToolCategory
}

export interface Profile {
  owner?: boolean,
  first_name: string,
  last_name: string,
  id: string,
  avatar_url?: string

}

type Scanner = {
  id: string;
  name: string,
  items: Scanner[]
  // Add other item properties
};

export interface Transform {
  id: string;
  name: string;
  description?: string;
  nodes: NodeData[];
  edges: EdgeData[];
  created_at?: string;
  updated_at?: string;
  owner?: Profile;
}

export type NodesData = {
  items: Scanner[];
  initialEdges?: Edge[];
  initialNodes?: Node[];
  transform?: Transform;
};

export interface Analysis {
  id: string; // UUID
  title: string;
  description?: string | null;
  content?: any; // JSONB, so can be any type
  created_at: string; // ISO date string
  last_updated_at: string; // ISO date string
  owner_id?: string | null; // UUID
  investigation_id?: string | null; // UUID
}

export interface Payload {
  message: string
  nodes?: GraphNode[]
  edges?: GraphEdge[]
}
export type Event = {
  id: string
  scan_id: string
  sketch_id: string | null
  type: EventLevel
  payload: Payload
  created_at: string
}

export interface ChatMessage {
  id: string,
  content: string,
  is_bot: boolean,
  created_at: string,
  context?: any,
  chatId?: string
}

export interface Chat {
  id: string,
  title: string,
  description: string,
  created_at: string,
  last_updated_at: string,
}
