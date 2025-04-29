/**
 * Graphology Rename Graph Keys
 * =============================
 *
 * Helpers allowing you to rename (ie. change the key) of nodes & edges .
 */
var copyEdge = require('./add-edge.js').copyEdge;

module.exports = function renameGraphKeys(
  graph,
  nodeKeyMapping,
  edgeKeyMapping
) {
  if (typeof nodeKeyMapping === 'undefined') nodeKeyMapping = {};
  if (typeof edgeKeyMapping === 'undefined') edgeKeyMapping = {};

  var renamed = graph.nullCopy();

  // Renaming nodes
  graph.forEachNode(function (key, attr) {
    var renamedKey = nodeKeyMapping[key];

    if (typeof renamedKey === 'undefined') renamedKey = key;

    renamed.addNode(renamedKey, attr);
  });

  // Renaming edges
  var currentSource, currentSourceRenamed;

  graph.forEachAssymetricAdjacencyEntry(function (
    source,
    target,
    _sa,
    _ta,
    key,
    attr,
    undirected
  ) {
    // Leveraging the ordered adjacency to save lookups
    if (source !== currentSource) {
      currentSource = source;
      currentSourceRenamed = nodeKeyMapping[source];

      if (typeof currentSourceRenamed === 'undefined')
        currentSourceRenamed = source;
    }

    var targetRenamed = nodeKeyMapping[target];

    if (typeof targetRenamed === 'undefined') targetRenamed = target;

    var renamedKey = edgeKeyMapping[key];

    if (typeof renamedKey === 'undefined') renamedKey = key;

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
