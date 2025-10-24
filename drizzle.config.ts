import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema/index.ts',
  out: './supabase/migrations',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
  migrations: {
    table: 'migrations',
  },
})
