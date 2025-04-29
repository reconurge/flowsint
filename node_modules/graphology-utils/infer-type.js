/**
 * Graphology inferType
 * =====================
 *
 * Useful function used to "guess" the real type of the given Graph using
 * introspection.
 */
var isGraph = require('./is-graph.js');

/**
 * Returning the inferred type of the given graph.
 *
 * @param  {Graph}   graph - Target graph.
 * @return {boolean}
 */
module.exports = function inferType(graph) {
  if (!isGraph(graph))
    throw new Error(
      'graphology-utils/infer-type: expecting a valid graphology instance.'
    );

  var declaredType = graph.type;

  if (declaredType !== 'mixed') return declaredType;

  if (
    (graph.directedSize === 0 && graph.undirectedSize === 0) ||
    (graph.directedSize > 0 && graph.undirectedSize > 0)
  )
    return 'mixed';

  if (graph.directedSize > 0) return 'directed';

  return 'undirected';
};
