/**
 * Graphology ForceAtlas2 Helpers
 * ===============================
 *
 * Miscellaneous helper functions.
 */

/**
 * Constants.
 */
var PPN = 10;
var PPE = 3;

/**
 * Very simple Object.assign-like function.
 *
 * @param  {object} target       - First object.
 * @param  {object} [...objects] - Objects to merge.
 * @return {object}
 */
exports.assign = function (target) {
  target = target || {};

  var objects = Array.prototype.slice.call(arguments).slice(1),
    i,
    k,
    l;

  for (i = 0, l = objects.length; i < l; i++) {
    if (!objects[i]) continue;

    for (k in objects[i]) target[k] = objects[i][k];
  }

  return target;
};

/**
 * Function used to validate the given settings.
 *
 * @param  {object}      settings - Settings to validate.
 * @return {object|null}
 */
exports.validateSettings = function (settings) {
  if ('linLogMode' in settings && typeof settings.linLogMode !== 'boolean')
    return {message: 'the `linLogMode` setting should be a boolean.'};

  if (
    'outboundAttractionDistribution' in settings &&
    typeof settings.outboundAttractionDistribution !== 'boolean'
  )
    return {
      message:
        'the `outboundAttractionDistribution` setting should be a boolean.'
    };

  if ('adjustSizes' in settings && typeof settings.adjustSizes !== 'boolean')
    return {message: 'the `adjustSizes` setting should be a boolean.'};

  if (
    'edgeWeightInfluence' in settings &&
    typeof settings.edgeWeightInfluence !== 'number'
  )
    return {
      message: 'the `edgeWeightInfluence` setting should be a number.'
    };

  if (
    'scalingRatio' in settings &&
    !(typeof settings.scalingRatio === 'number' && settings.scalingRatio >= 0)
  )
    return {message: 'the `scalingRatio` setting should be a number >= 0.'};

  if (
    'strongGravityMode' in settings &&
    typeof settings.strongGravityMode !== 'boolean'
  )
    return {message: 'the `strongGravityMode` setting should be a boolean.'};

  if (
    'gravity' in settings &&
    !(typeof settings.gravity === 'number' && settings.gravity >= 0)
  )
    return {message: 'the `gravity` setting should be a number >= 0.'};

  if (
    'slowDown' in settings &&
    !(typeof settings.slowDown === 'number' || settings.slowDown >= 0)
  )
    return {message: 'the `slowDown` setting should be a number >= 0.'};

  if (
    'barnesHutOptimize' in settings &&
    typeof settings.barnesHutOptimize !== 'boolean'
  )
    return {message: 'the `barnesHutOptimize` setting should be a boolean.'};

  if (
    'barnesHutTheta' in settings &&
    !(
      typeof settings.barnesHutTheta === 'number' &&
      settings.barnesHutTheta >= 0
    )
  )
    return {message: 'the `barnesHutTheta` setting should be a number >= 0.'};

  return null;
};

/**
 * Function generating a flat matrix for both nodes & edges of the given graph.
 *
 * @param  {Graph}    graph         - Target graph.
 * @param  {function} getEdgeWeight - Edge weight getter function.
 * @return {object}                 - Both matrices.
 */
exports.graphToByteArrays = function (graph, getEdgeWeight) {
  var order = graph.order;
  var size = graph.size;
  var index = {};
  var j;

  // NOTE: float32 could lead to issues if edge array needs to index large
  // number of nodes.
  var NodeMatrix = new Float32Array(order * PPN);
  var EdgeMatrix = new Float32Array(size * PPE);

  // Iterate through nodes
  j = 0;
  graph.forEachNode(function (node, attr) {
    // Node index
    index[node] = j;

    // Populating byte array
    NodeMatrix[j] = attr.x;
    NodeMatrix[j + 1] = attr.y;
    NodeMatrix[j + 2] = 0; // dx
    NodeMatrix[j + 3] = 0; // dy
    NodeMatrix[j + 4] = 0; // old_dx
    NodeMatrix[j + 5] = 0; // old_dy
    NodeMatrix[j + 6] = 1; // mass
    NodeMatrix[j + 7] = 1; // convergence
    NodeMatrix[j + 8] = attr.size || 1;
    NodeMatrix[j + 9] = attr.fixed ? 1 : 0;
    j += PPN;
  });

  // Iterate through edges
  j = 0;
  graph.forEachEdge(function (edge, attr, source, target, sa, ta, u) {
    var sj = index[source];
    var tj = index[target];

    var weight = getEdgeWeight(edge, attr, source, target, sa, ta, u);

    // Incrementing mass to be a node's weighted degree
    NodeMatrix[sj + 6] += weight;
    NodeMatrix[tj + 6] += weight;

    // Populating byte array
    EdgeMatrix[j] = sj;
    EdgeMatrix[j + 1] = tj;
    EdgeMatrix[j + 2] = weight;
    j += PPE;
  });

  return {
    nodes: NodeMatrix,
    edges: EdgeMatrix
  };
};

/**
 * Function applying the layout back to the graph.
 *
 * @param {Graph}         graph         - Target graph.
 * @param {Float32Array}  NodeMatrix    - Node matrix.
 * @param {function|null} outputReducer - A node reducer.
 */
exports.assignLayoutChanges = function (graph, NodeMatrix, outputReducer) {
  var i = 0;

  graph.updateEachNodeAttributes(function (node, attr) {
    attr.x = NodeMatrix[i];
    attr.y = NodeMatrix[i + 1];

    i += PPN;

    return outputReducer ? outputReducer(node, attr) : attr;
  });
};

/**
 * Function reading the positions (only) from the graph, to write them in the matrix.
 *
 * @param {Graph}        graph      - Target graph.
 * @param {Float32Array} NodeMatrix - Node matrix.
 */
exports.readGraphPositions = function (graph, NodeMatrix) {
  var i = 0;

  graph.forEachNode(function (node, attr) {
    NodeMatrix[i] = attr.x;
    NodeMatrix[i + 1] = attr.y;

    i += PPN;
  });
};

/**
 * Function collecting the layout positions.
 *
 * @param  {Graph}         graph         - Target graph.
 * @param  {Float32Array}  NodeMatrix    - Node matrix.
 * @param  {function|null} outputReducer - A nodes reducer.
 * @return {object}                      - Map to node positions.
 */
exports.collectLayoutChanges = function (graph, NodeMatrix, outputReducer) {
  var nodes = graph.nodes(),
    positions = {};

  for (var i = 0, j = 0, l = NodeMatrix.length; i < l; i += PPN) {
    if (outputReducer) {
      var newAttr = Object.assign({}, graph.getNodeAttributes(nodes[j]));
      newAttr.x = NodeMatrix[i];
      newAttr.y = NodeMatrix[i + 1];
      newAttr = outputReducer(nodes[j], newAttr);
      positions[nodes[j]] = {
        x: newAttr.x,
        y: newAttr.y
      };
    } else {
      positions[nodes[j]] = {
        x: NodeMatrix[i],
        y: NodeMatrix[i + 1]
      };
    }

    j++;
  }

  return positions;
};

/**
 * Function returning a web worker from the given function.
 *
 * @param  {function}  fn - Function for the worker.
 * @return {DOMString}
 */
exports.createWorker = function createWorker(fn) {
  var xURL = window.URL || window.webkitURL;
  var code = fn.toString();
  var objectUrl = xURL.createObjectURL(
    new Blob(['(' + code + ').call(this);'], {type: 'text/javascript'})
  );
  var worker = new Worker(objectUrl);
  xURL.revokeObjectURL(objectUrl);

  return worker;
};
