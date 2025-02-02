import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type NodeData = {
  id: string;
  position: any,
  data: any
};

export type EdgeData = {
  source: string;
  target: string;
  id: string;
  label: string;
};

export type InvestigationGraph = {
  nodes: NodeData[];
  edges: EdgeData[];
};

