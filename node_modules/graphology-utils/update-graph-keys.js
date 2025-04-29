/**
 * Graphology Update Graph Keys
 * =============================
 *
 * Helpers allowing you to update keys of nodes & edges .
 */
var copyEdge = require('./add-edge.js').copyEdge;

module.exports = function updateGraphKeys(
  graph,
  nodeKeyUpdater,
  edgeKeyUpdater
) {
  var renamed = graph.nullCopy();

  // Renaming nodes
  graph.forEachNode(function (key, attr) {
    var renamedKey = nodeKeyUpdater ? nodeKeyUpdater(key, attr) : key;
    renamed.addNode(renamedKey, attr);
  });

  // Renaming edges
  var currentSource, currentSourceRenamed;

  graph.forEachAssymetricAdjacencyEntry(function (
    source,
    target,
    sourceAttr,
    targetAttr,
    key,
    attr,
    undirected
  ) {
    // Leveraging the ordered adjacency to save calls
    if (source !== currentSource) {
      currentSource = source;
      currentSourceRenamed = nodeKeyUpdater
        ? nodeKeyUpdater(source, sourceAttr)
        : source;
    }

    var targetRenamed = nodeKeyUpdater
      ? nodeKeyUpdater(target, targetAttr)
      : target;

    var renamedKey = edgeKeyUpdater
      ? edgeKeyUpdater(
          key,
          attr,
          source,
          target,
          sourceAttr,
          targetAttr,
          undirected
        )
      : key;

    copyEdge(
      renamed,
      undirected,
      renamedKey,
      currentSourceRenamed,
      targetRenamed,
      attr
    );
  });

  return renamed;
};
