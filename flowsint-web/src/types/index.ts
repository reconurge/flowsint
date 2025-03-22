import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type NodeData = {
  id: string;
  position: any,
  type: string,
  data: any,
  parentId?: string,
  extent?: string
  width?: number,
  height?: number
};

export type EdgeData = {
  source: string;
  target: string;
  id: string;
  label: string;
  type: string,
  confidence_level?: number | string
};

export type InvestigationGraph = {
  nodes: NodeData[];
  edges: EdgeData[];
};


export interface Tool {
  name: string
  path: string
  description?: string
  install?: string[]
  run?: string
  url?: string
}

export interface ToolCategory {
  [key: string]: {
    [key: string]: Tool
  }
}

export interface Tools {
  [key: string]: ToolCategory
}

