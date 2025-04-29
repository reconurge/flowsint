import Graph, {Attributes} from 'graphology-types';

export default function updateGraphKeys<
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes
>(
  graph: Graph<NodeAttributes, EdgeAttributes>,
  nodeKeyUpdater: (key: string, attributes: NodeAttributes) => unknown,
  edgeKeyUpdater: (
    key: string,
    attributes: EdgeAttributes,
    source: string,
    target: string,
    sourceAttributes: NodeAttributes,
    targetAttributes: NodeAttributes,
    undirected: boolean
  ) => unknown
): Graph;
