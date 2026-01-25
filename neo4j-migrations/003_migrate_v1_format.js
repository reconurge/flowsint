/**
 * 003_migrate_v1_format.js
 *
 * Migrates nodes from V1 format to V2 format.
 *
 * V1 format (old):
 *   label: "example.com"
 *   type: "domain"
 *   created_at: "2026-01-23T18:28:46.048223+00:00"
 *   domain: "example.com"
 *   root: true
 *   sketch_id: "..."
 *   x, y: coordinates
 *
 * V2 format (new):
 *   nodeLabel: "example.com"
 *   nodeType: "domain"
 *   nodeMetadata.created_at: "2026-01-23T18:28:46.048223+00:00"
 *   nodeProperties.domain: "example.com"
 *   nodeProperties.root: true
 *   sketch_id: "..."
 *   x, y: coordinates
 *
 * This migration is IDEMPOTENT:
 * - Only processes nodes that have V1 format (have `label` or `type` but NOT `nodeLabel`)
 * - Safe to run multiple times
 * - Processes in batches to handle large datasets
 */

import neo4j from "neo4j-driver";

// Reserved properties that should NOT be moved to nodeProperties
const RESERVED_PROPERTIES = new Set([
  "id",
  "x",
  "y",
  "nodeLabel",
  "label",
  "nodeType",
  "type",
  "nodeImage",
  "nodeIcon",
  "nodeColor",
  "nodeSize",
  "nodeFlag",
  "nodeShape",
  "nodeMetadata",
  "nodeProperties",
  "created_at",
  "sketch_id",
]);

// Properties that are part of nodeMetadata
const METADATA_PROPERTIES = new Set(["created_at"]);

const BATCH_SIZE = 500;

/**
 * Main migration function
 * @param {import('neo4j-driver').Driver} driver
 * @param {import('neo4j-driver').Session} session
 * @param {boolean} dryRun
 * @returns {Promise<string>} Summary message
 */
export async function migrate(driver, session, dryRun) {
  // Count nodes needing migration (V1 format: has `type` but no `nodeType`)
  const countResult = await session.run(`
    MATCH (n)
    WHERE n.type IS NOT NULL AND n.nodeType IS NULL
    RETURN count(n) AS count
  `);
  const totalCount = countResult.records[0].get("count").toNumber();

  if (totalCount === 0) {
    return "No V1 format nodes found - nothing to migrate";
  }

  console.log(`[INFO] Found ${totalCount} nodes in V1 format to migrate`);

  if (dryRun) {
    // In dry-run, show sample of what would be migrated
    const sampleResult = await session.run(`
      MATCH (n)
      WHERE n.type IS NOT NULL AND n.nodeType IS NULL
      RETURN n, labels(n) AS labels
      LIMIT 5
    `);

    console.log("[DRY-RUN] Sample nodes that would be migrated:");
    for (const record of sampleResult.records) {
      const node = record.get("n").properties;
      const labels = record.get("labels");
      console.log(`  - [${labels.join(":")}] label="${node.label}", type="${node.type}"`);
    }

    return `Would migrate ${totalCount} nodes from V1 to V2 format`;
  }

  // Process in batches
  let migratedCount = 0;
  let batchNum = 0;

  while (migratedCount < totalCount) {
    batchNum++;
    console.log(
      `[INFO] Processing batch ${batchNum} (${migratedCount}/${totalCount} done)`
    );

    // Fetch a batch of V1 nodes
    const batchResult = await session.run(
      `
      MATCH (n)
      WHERE n.type IS NOT NULL AND n.nodeType IS NULL
      RETURN elementId(n) AS elementId, n, labels(n) AS labels
      LIMIT $limit
    `,
      { limit: neo4j.int(BATCH_SIZE) }
    );

    if (batchResult.records.length === 0) {
      break;
    }

    // Process each node in the batch
    for (const record of batchResult.records) {
      const elementId = record.get("elementId");
      const node = record.get("n").properties;

      // Build the new properties
      const updates = buildV2Properties(node);

      // Apply the update
      await session.run(
        `
        MATCH (n)
        WHERE elementId(n) = $elementId
        SET n += $updates
        REMOVE n.label, n.type, n.created_at
      `,
        { elementId, updates }
      );

      // Remove old dynamic properties that were moved to nodeProperties
      const propsToRemove = Object.keys(node).filter(
        (key) =>
          !RESERVED_PROPERTIES.has(key) &&
          !key.startsWith("nodeProperties.") &&
          !key.startsWith("nodeMetadata.")
      );

      if (propsToRemove.length > 0) {
        // Build dynamic REMOVE clause
        const removeClause = propsToRemove.map((p) => `n.\`${p}\``).join(", ");
        await session.run(
          `
          MATCH (n)
          WHERE elementId(n) = $elementId
          REMOVE ${removeClause}
        `,
          { elementId }
        );
      }

      migratedCount++;
    }
  }

  return `Migrated ${migratedCount} nodes from V1 to V2 format`;
}

/**
 * Builds V2 format properties from V1 node
 * @param {Record<string, any>} node - V1 node properties
 * @returns {Record<string, any>} - V2 format properties to SET
 */
function buildV2Properties(node) {
  const updates = {};

  // Map core fields
  updates.nodeLabel = node.label || node.nodeLabel || "";
  updates.nodeType = node.type || node.nodeType || "";

  // Handle created_at -> nodeMetadata.created_at
  if (node.created_at) {
    updates["nodeMetadata.created_at"] = node.created_at;
  } else if (!node["nodeMetadata.created_at"]) {
    // Set current timestamp if no created_at exists
    updates["nodeMetadata.created_at"] = new Date().toISOString();
  }

  // Move non-reserved properties to nodeProperties.*
  for (const [key, value] of Object.entries(node)) {
    // Skip reserved properties
    if (RESERVED_PROPERTIES.has(key)) continue;

    // Skip properties already in nodeProperties/nodeMetadata namespace
    if (key.startsWith("nodeProperties.") || key.startsWith("nodeMetadata.")) {
      continue;
    }

    // Move to nodeProperties
    updates[`nodeProperties.${key}`] = value;
  }

  return updates;
}
