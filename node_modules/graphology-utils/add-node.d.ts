import Graph, {Attributes} from 'graphology-types';

export function copyNode<NodeAttributes extends Attributes = Attributes>(
  graph: Graph,
  key: unknown,
  attributes?: NodeAttributes
): string;
