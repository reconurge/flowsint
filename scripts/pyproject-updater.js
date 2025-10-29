/**
 * Custom updater for pyproject.toml
 * Used by standard-version to bump version in pyproject.toml
 */

const stringifyPackage = require('stringify-package');
const detectIndent = require('detect-indent');
const detectNewline = require('detect-newline');

module.exports.readVersion = function (contents) {
  const match = contents.match(/^version = "(.*)"$/m);
  return match ? match[1] : null;
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(
    /^version = ".*"$/m,
    `version = "${version}"`
  );
};
