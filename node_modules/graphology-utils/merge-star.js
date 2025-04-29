/**
 * Graphology mergeStar
 * =====================
 *
 * Function merging the given star to the graph.
 */

/**
 * Merging the given star to the graph.
 *
 * @param  {Graph} graph - Target graph.
 * @param  {array} nodes - Nodes to add, first one being the center of the star.
 */
module.exports = function mergeStar(graph, nodes) {
  if (nodes.length === 0) return;

  var node, i, l;

  var center = nodes[0];

  graph.mergeNode(center);

  for (i = 1, l = nodes.length; i < l; i++) {
    node = nodes[i];

    graph.mergeEdge(center, node);
  }
};
