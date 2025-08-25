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
  from: string;
  to: string;
  date: string;
  id: string;
  label: string;
  caption?: string;
  type: string;
  confidence_level?: number | string
};

export type InvestigationGraph = {
  nodes: Node[];
  edges: Edge[];
};

export type ForceGraphSetting = {
  value: any,
  min?: number,
  max?: number,
  step?: number,
  type?: string,
  description?: string,
}

export type GeneralSetting = {
  value: any,
  options?: any[]
  description?: string,
}

export type Settings = {
  [key: string]: ForceGraphSetting | GeneralSetting,
}
