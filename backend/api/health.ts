import type { Hono } from 'hono';

type Bindings = { DB: D1Database; ASSETS: Fetcher };
type App = Hono<{ Bindings: Bindings }>;

export default (app: App) => {
  app.get('/api/health', (c) => c.json({ ok: true }));
};