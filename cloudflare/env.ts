import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export type Env = {
  DB: D1Database
  ALBUMS: R2Bucket
  ADMIN_PASSWORD?: string
  SESSION_SECRET?: string
}
