import type { Edge, Node } from "@xyflow/react";

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