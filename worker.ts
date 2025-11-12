import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
};

type App = Hono<{ Bindings: Bindings }>;
const app: App = new Hono();

app.use('*', cors());

// Auto-load every API registerer under backend/api/*.ts
const modules = import.meta.glob('./backend/api/*.ts', { eager: true });
for (const m of Object.values(modules)) {
  // Each module should export default: (app: App) => void
  const mod = m as { default?: (app: App) => void };
  if (typeof mod.default === 'function') mod.default(app);
}

// 404 → fall back to static assets (SPA)
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw));

export default app;