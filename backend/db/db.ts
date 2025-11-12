import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export type Bindings = {
  DB: D1Database
}

export function getDb(env: { DB: D1Database }) {
  return drizzle(env.DB, { schema })
}

