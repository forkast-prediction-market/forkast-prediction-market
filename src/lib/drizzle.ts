import { drizzle } from 'drizzle-orm/postgres-js'
import * as postgres from 'postgres'
import * as schema from './db/schema'

const client = postgres.default(process.env.POSTGRES_URL!)
export const db = drizzle(client, { schema })
