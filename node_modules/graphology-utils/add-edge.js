/**
 * Graphology Edge Adders
 * =======================
 *
 * Generic edge addition functions that can be used to avoid nasty repetitive
 * conditions.
 */
exports.addEdge = function addEdge(
  graph,
  undirected,
  key,
  source,
  target,
  attributes
) {
  if (undirected) {
    if (key === null || key === undefined)
      return graph.addUndirectedEdge(source, target, attributes);
    else return graph.addUndirectedEdgeWithKey(key, source, target, attributes);
  } else {
    if (key === null || key === undefined)
      return graph.addDirectedEdge(source, target, attributes);
    else return graph.addDirectedEdgeWithKey(key, source, target, attributes);
  }
};

exports.copyEdge = function copyEdge(
  graph,
  undirected,
  key,
  source,
  target,
  attributes
) {
  attributes = Object.assign({}, attributes);

  if (undirected) {
    if (key === null || key === undefined)
      return graph.addUndirectedEdge(source, target, attributes);
    else return graph.addUndirectedEdgeWithKey(key, source, target, attributes);
  } else {
    if (key === null || key === undefined)
      return graph.addDirectedEdge(source, target, attributes);
    else return graph.addDirectedEdgeWithKey(key, source, target, attributes);
  }
};

exports.mergeEdge = function mergeEdge(
  graph,
  undirected,
  key,
  source,
  target,
  attributes
) {
  if (undirected) {
    if (key === null || key === undefined)
      return graph.mergeUndirectedEdge(source, target, attributes);
    else
      return graph.mergeUndirectedEdgeWithKey(key, source, target, attributes);
  } else {
    if (key === null || key === undefined)
      return graph.mergeDirectedEdge(source, target, attributes);
    else return graph.mergeDirectedEdgeWithKey(key, source, target, attributes);
  }
};

exports.updateEdge = function updateEdge(
  graph,
  undirected,
  key,
  source,
  target,
  updater
) {
  if (undirected) {
    if (key === null || key === undefined)
      return graph.updateUndirectedEdge(source, target, updater);
    else return graph.updateUndirectedEdgeWithKey(key, source, target, updater);
  } else {
    if (key === null || key === undefined)
      return graph.updateDirectedEdge(source, target, updater);
    else return graph.updateDirectedEdgeWithKey(key, source, target, updater);
  }
};
