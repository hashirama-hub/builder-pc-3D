// workers/api/env.ts
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

/** Bindings injected by the Cloudflare Workers runtime (see wrangler.toml). */
export interface Env {
  /** D1 database holding products + builds. */
  DB: D1Database;
  /** KV namespace used by the rate limiter. */
  KV: KVNamespace;
}
