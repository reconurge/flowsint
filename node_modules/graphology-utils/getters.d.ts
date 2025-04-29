import Graph, {Attributes, NodeMapper, EdgeMapper} from 'graphology-types';

export type PartialEdgeMapper<
  T,
  EdgeAttributes extends Attributes = Attributes
> = (
  edge: string,
  attributes: EdgeAttributes,
  source: string,
  target: string
) => T;

export type MinimalEdgeMapper<
  T,
  EdgeAttributes extends Attributes = Attributes
> = (edge: string, attributes: EdgeAttributes) => T;

interface NodeValueGetter<T, NodeAttributes extends Attributes = Attributes> {
  fromGraph(graph: Graph<NodeAttributes>, node: unknown): T;
  fromAttributes(attributes: NodeAttributes): T;
  fromEntry: NodeMapper<T, NodeAttributes>;
}

interface EdgeValueGetter<
  T,
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes
> {
  fromGraph(graph: Graph<NodeAttributes, EdgeAttributes>, edge: unknown): T;
  // fromPath(
  //   graph: Graph<NodeAttributes, EdgeAttributes>,
  //   source: unknown,
  //   target: unknown
  // ): T;
  // fromDirectedPath(
  //   graph: Graph<NodeAttributes, EdgeAttributes>,
  //   source: unknown,
  //   target: unknown
  // ): T;
  // fromUndirectedPath(
  //   graph: Graph<NodeAttributes, EdgeAttributes>,
  //   source: unknown,
  //   target: unknown
  // ): T;
  fromAttributes(attributes: EdgeAttributes): T;
  fromEntry: EdgeMapper<T, NodeAttributes, EdgeAttributes>;
  fromPartialEntry: PartialEdgeMapper<T, EdgeAttributes>;
  fromMinimalEntry: MinimalEdgeMapper<T, EdgeAttributes>;
}

export function createNodeValueGetter<
  T,
  NodeAttributes extends Attributes = Attributes
>(
  target?: string | NodeMapper<T, NodeAttributes>,
  defaultValue?: T | ((value: unknown) => T)
): NodeValueGetter<T, NodeAttributes>;

export function createEdgeValueGetter<
  T,
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes
>(
  target?:
    | string
    | EdgeMapper<T, NodeAttributes, EdgeAttributes>
    | PartialEdgeMapper<T, EdgeAttributes>,
  defaultValue?: T | ((value: unknown) => T)
): EdgeValueGetter<T, NodeAttributes, EdgeAttributes>;

export function createEdgeWeightGetter<
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes
>(
  target?:
    | string
    | EdgeMapper<number, NodeAttributes, EdgeAttributes>
    | PartialEdgeMapper<number, EdgeAttributes>
): EdgeValueGetter<number, NodeAttributes, EdgeAttributes>;
