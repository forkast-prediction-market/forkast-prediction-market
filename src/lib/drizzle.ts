import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './db/schema'

const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined
  db: ReturnType<typeof drizzle> | undefined
}

const client = globalForDb.client ?? postgres(process.env.POSTGRES_URL!)
const db = globalForDb.db ?? drizzle(client, { schema })

globalForDb.client = client
globalForDb.db = db

export { db }
