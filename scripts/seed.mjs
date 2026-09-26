// scripts/seed.mjs — offline alternative to `npm run seed`.
// Applies db/schema.sql + db/seed.sql directly to the local D1 SQLite file(s)
// that wrangler keeps under .wrangler/state, using node:sqlite. No network,
// no wrangler invocation.
//
// Prerequisite: local D1 state must exist. Run `npm run seed` (or `npm run
// dev:api`) once so wrangler creates it, then re-run this script any time:
//   node scripts/seed.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIPPED_DIRS = new Set(['.git', '.next', '.turbo', 'node_modules']);
const MIN_PARTS = 30;

/** Recursively collect D1 objects under any `.wrangler/state` tree (v3/v4 layouts). */
function findLocalD1Databases(dir, found) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      findLocalD1Databases(full, found);
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.sqlite') &&
      entry.name !== 'metadata.sqlite' && // miniflare's own bookkeeping DB, not a D1 object
      full.includes(`${sep}.wrangler${sep}`) &&
      full.includes('miniflare-D1DatabaseObject')
    ) {
      found.push(full);
    }
  }
  return found;
}

const databases = findLocalD1Databases(repoRoot, []);
if (databases.length === 0) {
  console.error('seed: no local D1 state found under .wrangler/state.');
  console.error('      Run `npm run seed` once to let wrangler create it, then re-run this script.');
  process.exit(1);
}

const schemaSql = readFileSync(resolve(repoRoot, 'db/schema.sql'), 'utf8');
const seedSql = readFileSync(resolve(repoRoot, 'db/seed.sql'), 'utf8');

let failed = false;
for (const dbFile of databases) {
  const db = new DatabaseSync(dbFile);
  try {
    db.exec(schemaSql);
    db.exec(seedSql);
    const row = db.prepare('SELECT COUNT(*) AS count FROM products').get() ?? { count: 0 };
    const count = Number(row.count);
    console.log(`seed: ${count} products -> ${relative(repoRoot, dbFile)}`);
    if (count < MIN_PARTS) {
      console.error(`seed: expected at least ${MIN_PARTS} parts, found ${count}`);
      failed = true;
    }
  } catch (error) {
    console.error(`seed: failed on ${relative(repoRoot, dbFile)}: ${String(error)}`);
    failed = true;
  } finally {
    db.close();
  }
}

process.exit(failed ? 1 : 0);
