#!/usr/bin/env node

/**
 * Version Synchronization Script
 *
 * Keeps versions synchronized across:
 * - pyproject.toml (root)
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

function updatePyprojectVersion(version) {
  const pyprojectPath = join(ROOT_DIR, 'pyproject.toml');
  let content = readFileSync(pyprojectPath, 'utf8');

  // Update version in [tool.poetry] section
  content = content.replace(
    /^version = ".*"$/m,
    `version = "${version}"`
  );

  writeFileSync(pyprojectPath, content, 'utf8');
  console.log(`✓ Updated pyproject.toml to ${version}`);
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
  updatePyprojectVersion(newVersion);
  updatePackageJsonVersion(newVersion);
  console.log(`\n✓ All versions synchronized to ${newVersion}`);
} catch (error) {
  console.error('Error syncing versions:', error.message);
  process.exit(1);
}
