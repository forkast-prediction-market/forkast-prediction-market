import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  breakpoints: false,
  schema: './src/lib/db/schema/index.ts',
  out: './src/lib/db/migrations',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
  migrations: {
    table: 'migrations',
    schema: 'public',
  },
})
