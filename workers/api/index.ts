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
 * server names, so every cross-origin reader (local dev servers, the Pages
 * deployment) has to be listed explicitly. Anything else gets no
 * `Access-Control-Allow-Origin` header at all.
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://pc-builder-3d.pages.dev',
];

// CORS first: it answers the OPTIONS preflight itself (204) without reaching
// the routes or spending rate-limit budget.
app.use(
  '*',
  cors({
    origin: ALLOWED_ORIGINS,
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
