// scripts/seed.ts — applies db/schema.sql + db/seed.sql to the local D1 database
// by shelling out to `wrangler d1 execute --local` (same DB `npm run dev:api` uses).
// Node >= 22 runs this .ts file directly via type stripping:  node scripts/seed.ts
// Equivalent to `npm run seed`.
//
// Why spawn wrangler instead of opening SQLite ourselves: wrangler owns the local
// D1 state file location/hash, so seeding through it always targets the exact
// database the dev server reads. For the pure-SQLite alternative see scripts/seed.mjs.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = resolve(repoRoot, 'workers/api');
const sqlFiles: readonly string[] = ['db/schema.sql', 'db/seed.sql'];
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

for (const relativePath of sqlFiles) {
  const file = resolve(repoRoot, relativePath);
  if (!existsSync(file)) {
    console.error(`seed: missing ${relativePath}`);
    process.exit(1);
  }
  console.log(`seed: wrangler d1 execute PC_BUILDER_DB --local --file ${relativePath}`);
  const result = spawnSync(
    npxCommand,
    ['wrangler', 'd1', 'execute', 'PC_BUILDER_DB', '--local', '--file', file],
    { cwd: apiDir, stdio: 'inherit' }
  );
  if (result.error) {
    console.error(`seed: failed to run ${npxCommand}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('seed: done');
