#!/usr/bin/env node
/**
 * Neo4j Migration Runner
 *
 * Runs migrations from neo4j-migrations/ directory in order.
 * Tracks applied migrations in (:_Migration) nodes to prevent re-running.
 * All migrations must be idempotent for safety.
 *
 * Usage:
 *   node scripts/migrate.js [--dry-run]
 *
 * Environment variables (from .env or shell):
 *   NEO4J_URI_BOLT - Bolt URI (default: bolt://localhost:7687)
 *   NEO4J_USERNAME - Username (default: neo4j)
 *   NEO4J_PASSWORD - Password (required)
 */

import "dotenv/config";
import neo4j from "neo4j-driver";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "neo4j-migrations");

const config = {
  uri: "bolt://localhost:7687",
  user: process.env.NEO4J_USERNAME || "neo4j",
  password: process.env.NEO4J_PASSWORD,
};

const isDryRun = process.argv.includes("--dry-run");

/**
 * Logger with consistent formatting
 */
const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  success: (msg) => console.log(`[OK] ${msg}`),
  dry: (msg) => console.log(`[DRY-RUN] ${msg}`),
};

/**
 * Ensures the _Migration tracking infrastructure exists
 */
async function ensureMigrationInfrastructure(session) {
  await session.run(`
    CREATE CONSTRAINT migration_name_unique IF NOT EXISTS
    FOR (m:_Migration) REQUIRE m.name IS UNIQUE
  `);
}

/**
 * Gets list of already applied migrations
 */
async function getAppliedMigrations(session) {
  const result = await session.run(`
    MATCH (m:_Migration)
    RETURN m.name AS name
    ORDER BY m.name
  `);
  return new Set(result.records.map((r) => r.get("name")));
}

/**
 * Records a migration as applied
 */
async function recordMigration(session, name) {
  await session.run(
    `
    MERGE (m:_Migration {name: $name})
    ON CREATE SET m.applied_at = datetime()
    ON MATCH SET m.last_run_at = datetime()
  `,
    { name },
  );
}

/**
 * Gets all migration files sorted by name
 */
async function getMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith(".cypher") || f.endsWith(".js"))
    .filter((f) => !f.startsWith("_")) // Skip files starting with _
    .sort();
}

/**
 * Runs a .cypher migration file
 * Splits on semicolons and runs each statement
 */
async function runCypherMigration(session, filePath, dryRun) {
  const content = await fs.readFile(filePath, "utf-8");

  // Split by semicolons, filter empty statements and comments-only blocks
  const statements = content
    .split(";")
    .map((s) => s.trim())
    .filter((s) => {
      // Remove comment-only statements
      const withoutComments = s
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n")
        .trim();
      return withoutComments.length > 0;
    });

  for (const statement of statements) {
    if (dryRun) {
      log.dry(`Would execute: ${statement.substring(0, 80)}...`);
    } else {
      await session.run(statement);
    }
  }

  return statements.length;
}

/**
 * Runs a .js migration file
 * The file must export a `migrate(driver, session, dryRun)` function
 */
async function runJsMigration(driver, session, filePath, dryRun) {
  const module = await import(
    fileURLToPath(new URL(filePath, import.meta.url))
  );

  if (typeof module.migrate !== "function") {
    throw new Error(`Migration ${filePath} must export a 'migrate' function`);
  }

  return await module.migrate(driver, session, dryRun);
}

/**
 * Main migration runner
 */
async function main() {
  if (!config.password) {
    log.error("NEO4J_PASSWORD environment variable is required");
    process.exit(1);
  }

  if (isDryRun) {
    log.info("Running in dry-run mode - no changes will be made");
  }

  log.info(`Connecting to Neo4j at ${config.uri}`);

  const driver = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.user, config.password),
  );

  try {
    // Verify connectivity
    await driver.verifyConnectivity();
    log.success("Connected to Neo4j");

    const session = driver.session();

    try {
      // Setup migration tracking
      if (!isDryRun) {
        await ensureMigrationInfrastructure(session);
      }

      // Get applied migrations
      const applied = isDryRun
        ? new Set()
        : await getAppliedMigrations(session);
      if (applied.size > 0) {
        log.info(`Found ${applied.size} previously applied migrations`);
      }

      // Get all migration files
      const files = await getMigrationFiles();
      log.info(`Found ${files.length} migration files`);

      let appliedCount = 0;
      let skippedCount = 0;

      for (const file of files) {
        const migrationName = file.replace(/\.(cypher|js)$/, "");
        const filePath = path.join(MIGRATIONS_DIR, file);

        if (applied.has(migrationName)) {
          log.info(`Skipping ${file} (already applied)`);
          skippedCount++;
          continue;
        }

        log.info(`Running migration: ${file}`);

        try {
          if (file.endsWith(".cypher")) {
            const count = await runCypherMigration(session, filePath, isDryRun);
            log.success(`${file}: executed ${count} statements`);
          } else if (file.endsWith(".js")) {
            const result = await runJsMigration(
              driver,
              session,
              filePath,
              isDryRun,
            );
            log.success(`${file}: ${result || "completed"}`);
          }

          // Record migration as applied
          if (!isDryRun) {
            await recordMigration(session, migrationName);
          }

          appliedCount++;
        } catch (err) {
          log.error(`Migration ${file} failed: ${err.message}`);
          throw err;
        }
      }

      log.info("---");
      log.success(
        `Migration complete: ${appliedCount} applied, ${skippedCount} skipped`,
      );
    } finally {
      await session.close();
    }
  } catch (err) {
    log.error(`Migration failed: ${err.message}`);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

main();
