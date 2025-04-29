import Graph from 'graphology-types';

export default function renameGraphKeys(
  graph: Graph,
  nodeKeyMapping: Record<string, unknown>,
  edgeKeyMapping: Record<string, unknown>
): Graph;
