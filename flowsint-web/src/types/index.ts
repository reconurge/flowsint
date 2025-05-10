import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type NodeData = {
  id: string;
  position: any,
  type: string,
  data: any,
  width?: number,
  height?: number,
  x?: number,
  y?: number
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
  description?: string,
  active: boolean
  repo?: string
  avatar?: string
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

