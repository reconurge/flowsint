/**
 * Graphology inferMulti
 * ======================
 *
 * Useful function used to "guess" if the given graph is truly multi.
 */
var isGraph = require('./is-graph.js');

/**
 * Returning whether the given graph is inferred as multi.
 *
 * @param  {Graph}   graph - Target graph.
 * @return {boolean}
 */
module.exports = function inferMulti(graph) {
  if (!isGraph(graph))
    throw new Error(
      'graphology-utils/infer-multi: expecting a valid graphology instance.'
    );

  if (!graph.multi || graph.order === 0 || graph.size < 2) return false;

  var multi = false;

  // TODO: improve this with suitable methods
  var previousSource, previousTarget, wasUndirected, tmp;

  graph.forEachAssymetricAdjacencyEntry(function (s, t, sa, ta, e, ea, u) {
    if (multi) return; // TODO: we need #.someAdjacencyEntry

    if (u && s > t) {
      tmp = t;
      t = s;
      s = tmp;
    }

    if (s === previousSource && t === previousTarget && u === wasUndirected) {
      multi = true;
      return;
    }

    previousSource = s;
    previousTarget = t;
    wasUndirected = u;
  });

  return multi;
};
