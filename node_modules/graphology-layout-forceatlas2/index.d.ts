import Graph, {Attributes, EdgeMapper} from 'graphology-types';

type LayoutMapping = {[key: string]: {x: number; y: number}};

export type ForceAtlas2Settings = {
  linLogMode?: boolean;
  outboundAttractionDistribution?: boolean;
  adjustSizes?: boolean;
  edgeWeightInfluence?: number;
  scalingRatio?: number;
  strongGravityMode?: boolean;
  gravity?: number;
  slowDown?: number;
  barnesHutOptimize?: boolean;
  barnesHutTheta?: number;
};

export type ForceAtlas2LayoutParameters<
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes
> = {
  settings?: ForceAtlas2Settings;
  getEdgeWeight?:
    | keyof EdgeAttributes
    | EdgeMapper<number, NodeAttributes, EdgeAttributes>
    | null;
  outputReducer?: (key: string, attributes: any) => any;
};

export interface ForceAtlas2SynchronousLayoutParameters<
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes
> extends ForceAtlas2LayoutParameters<NodeAttributes, EdgeAttributes> {
  iterations: number;
}

interface IForceAtlas2Layout {
  (graph: Graph, iterations: number): LayoutMapping;
  <
    NodeAttributes extends Attributes = Attributes,
    EdgeAttributes extends Attributes = Attributes
  >(
    graph: Graph,
    params: ForceAtlas2SynchronousLayoutParameters<
      NodeAttributes,
      EdgeAttributes
    >
  ): LayoutMapping;

  assign(graph: Graph, iterations: number): void;
  assign<
    NodeAttributes extends Attributes = Attributes,
    EdgeAttributes extends Attributes = Attributes
  >(
    graph: Graph,
    params: ForceAtlas2SynchronousLayoutParameters<
      NodeAttributes,
      EdgeAttributes
    >
  ): void;

  inferSettings(order: number): ForceAtlas2Settings;
  inferSettings(graph: Graph): ForceAtlas2Settings;
}

export function inferSettings(order: number): ForceAtlas2Settings;
export function inferSettings(graph: Graph): ForceAtlas2Settings;

declare const forceAtlas2: IForceAtlas2Layout;

export default forceAtlas2;
