// workers/api/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { rateLimit } from './middleware/rateLimit';
import { productsRoute } from './routes/products';
import { buildsRoute } from './routes/builds';
import { compatRoute } from './routes/compat';

const app = new Hono<{ Bindings: Env }>();

/**
 * Strict origin allowlist: a browser only exposes a response to an origin the
 * server names, so every cross-origin reader has to match one of these rules.
 * Anything else gets no `Access-Control-Allow-Origin` header at all.
 */

/** Any local dev server, whatever port it picked (`http://localhost:5173`, `:4173`, ...). */
const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;

/** The production Pages domain plus its `<hash>.` preview subdomains. */
const PAGES_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.pc-builder-3d\.pages\.dev$/;

/** Origins that are allowed exactly as written. */
const EXACT_ORIGINS = ['https://pc-builder-3d.pages.dev'];

const isAllowedOrigin = (origin: string): boolean =>
  LOCALHOST_ORIGIN.test(origin) ||
  PAGES_PREVIEW_ORIGIN.test(origin) ||
  EXACT_ORIGINS.includes(origin);

// CORS first: it answers the OPTIONS preflight itself (204) without reaching
// the routes or spending rate-limit budget.
app.use(
  '*',
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : undefined),
    allowMethods: ['GET', 'POST'],
    allowHeaders: ['Content-Type'],
  })
);
app.use('*', rateLimit);

app.route('/api/products', productsRoute);
app.route('/api/builds', buildsRoute);
app.route('/api/compat', compatRoute);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
