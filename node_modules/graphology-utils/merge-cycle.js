/**
 * Graphology mergeCycle
 * =====================
 *
 * Function merging the given cycle to the graph.
 */

/**
 * Merging the given cycle to the graph.
 *
 * @param  {Graph} graph - Target graph.
 * @param  {array} nodes - Nodes representing the cycle to merge.
 */
module.exports = function mergeCycle(graph, nodes) {
  if (nodes.length === 0) return;

  var previousNode, node, i, l;

  graph.mergeNode(nodes[0]);

  if (nodes.length === 1) return;

  for (i = 1, l = nodes.length; i < l; i++) {
    previousNode = nodes[i - 1];
    node = nodes[i];

    graph.mergeEdge(previousNode, node);
  }

  graph.mergeEdge(node, nodes[0]);
};
