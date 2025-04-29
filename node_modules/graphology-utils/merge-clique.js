/**
 * Graphology mergeClique
 * =======================
 *
 * Function merging the given clique to the graph.
 */

/**
 * Merging the given clique to the graph.
 *
 * @param  {Graph} graph - Target graph.
 * @param  {array} nodes - Nodes representing the clique to merge.
 */
module.exports = function mergeClique(graph, nodes) {
  if (nodes.length === 0) return;

  var source, target, i, j, l;

  for (i = 0, l = nodes.length; i < l; i++) {
    source = nodes[i];

    for (j = i + 1; j < l; j++) {
      target = nodes[j];

      graph.mergeEdge(source, target);
    }
  }
};
