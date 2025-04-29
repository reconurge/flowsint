/**
 * Graphology mergePath
 * =====================
 *
 * Function merging the given path to the graph.
 */

/**
 * Merging the given path to the graph.
 *
 * @param  {Graph} graph - Target graph.
 * @param  {array} nodes - Nodes representing the path to merge.
 */
module.exports = function mergePath(graph, nodes) {
  if (nodes.length === 0) return;

  var previousNode, node, i, l;

  graph.mergeNode(nodes[0]);

  for (i = 1, l = nodes.length; i < l; i++) {
    previousNode = nodes[i - 1];
    node = nodes[i];

    graph.mergeEdge(previousNode, node);
  }
};
