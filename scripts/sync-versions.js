#!/usr/bin/env node

/**
 * Version Synchronization Script
 *
 * Keeps versions synchronized across:
 * - pyproject.toml (root + every uv workspace member)
 * - flowsint-app/package.json
 *
 * Usage: node scripts/sync-versions.js <new-version>
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Root pyproject.toml + every [tool.uv.workspace] member (kept in lockstep
// with the root version since they're path deps of one shipped project, not
// independently published packages).
const PYPROJECT_DIRS = [
  '.',
  'flowsint-api',
  'flowsint-core',
  'flowsint-enrichers',
  'flowsint-types',
];

function updatePyprojectVersion(dir, version) {
  const pyprojectPath = join(ROOT_DIR, dir, 'pyproject.toml');
  let content = readFileSync(pyprojectPath, 'utf8');

  // Update version in [project] section
  content = content.replace(
    /^version = ".*"$/m,
    `version = "${version}"`
  );

  writeFileSync(pyprojectPath, content, 'utf8');
  console.log(`✓ Updated ${dir}/pyproject.toml to ${version}`);
}

function updatePackageJsonVersion(version) {
  const packagePath = join(ROOT_DIR, 'flowsint-app', 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));

  pkg.version = version;

  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`✓ Updated flowsint-app/package.json to ${version}`);
}

function getCurrentVersion() {
  const packagePath = join(ROOT_DIR, 'flowsint-app', 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  return pkg.version;
}

// Main execution
const newVersion = process.argv[2];

if (!newVersion) {
  console.log(`Current version: ${getCurrentVersion()}`);
  console.log('\nUsage: node scripts/sync-versions.js <version>');
  console.log('Example: node scripts/sync-versions.js 1.2.3');
  process.exit(1);
}

// Validate semantic version format
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
  console.error('Error: Invalid version format. Expected: X.Y.Z or X.Y.Z-suffix');
  process.exit(1);
}

try {
  for (const dir of PYPROJECT_DIRS) {
    updatePyprojectVersion(dir, newVersion);
  }
  updatePackageJsonVersion(newVersion);
  console.log(`\n✓ All versions synchronized to ${newVersion}`);
} catch (error) {
  console.error('Error syncing versions:', error.message);
  process.exit(1);
}
