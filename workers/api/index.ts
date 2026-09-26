// workers/api/index.ts
import { Hono } from 'hono';
import type { Env } from './env';
import { rateLimit } from './middleware/rateLimit';
import { productsRoute } from './routes/products';
import { buildsRoute } from './routes/builds';
import { compatRoute } from './routes/compat';

const app = new Hono<{ Bindings: Env }>();

app.use('*', rateLimit);

app.route('/api/products', productsRoute);
app.route('/api/builds', buildsRoute);
app.route('/api/compat', compatRoute);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
