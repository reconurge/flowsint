/**
 * Graphology Defaults
 * ====================
 *
 * Helper function used throughout the standard lib to resolve defaults.
 */
function isLeaf(o) {
  return (
    !o ||
    typeof o !== 'object' ||
    typeof o === 'function' ||
    Array.isArray(o) ||
    o instanceof Set ||
    o instanceof Map ||
    o instanceof RegExp ||
    o instanceof Date
  );
}

function resolveDefaults(target, defaults) {
  target = target || {};

  var output = {};

  for (var k in defaults) {
    var existing = target[k];
    var def = defaults[k];

    // Recursion
    if (!isLeaf(def)) {
      output[k] = resolveDefaults(existing, def);

      continue;
    }

    // Leaf
    if (existing === undefined) {
      output[k] = def;
    } else {
      output[k] = existing;
    }
  }

  return output;
}

module.exports = resolveDefaults;
