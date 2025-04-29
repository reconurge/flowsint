/**
 * Graphology Node Adders
 * =======================
 *
 * Generic node addition functions that can be used to avoid nasty repetitive
 * conditions.
 */
exports.copyNode = function (graph, key, attributes) {
  attributes = Object.assign({}, attributes);
  return graph.addNode(key, attributes);
};
