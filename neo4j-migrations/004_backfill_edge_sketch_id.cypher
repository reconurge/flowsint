// 004_backfill_edge_sketch_id.cypher
// Backfill sketch_id on relationships that are missing it.
// Copies sketch_id from the source node onto the relationship.
// Idempotent: only touches relationships where sketch_id IS NULL.

MATCH (a)-[r]->(b)
WHERE r.sketch_id IS NULL AND a.sketch_id IS NOT NULL
SET r.sketch_id = a.sketch_id;
