#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

(async () => {
  let exitCode = 1

  const connectionString = process.env.POSTGRES_URL
  if (!connectionString) {
    console.error('ERROR: No database connection string found. Please configure one of: POSTGRES_URL.')
    process.exit(exitCode)
  }

  console.log('Database connection configured, connecting with admin privileges...')

  const client = new Pool({
    connectionString: process.env.POSTGRES_URL,
  })

  try {
    await client.connect()
    console.log('Connected to database successfully.')
    console.log('Creating migrations tracking table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('Migrations table ready.')

    const migrationsDir = new URL('./migrations', import.meta.url).pathname
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    console.log(`Found ${migrationFiles.length} migration files.`)

    for (const file of migrationFiles) {
      const version = file.replace('.sql', '')

      const alreadyApplied = await client.query(
        'SELECT version FROM public.migrations WHERE version = $1',
        [version],
      )

      if (alreadyApplied.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already applied).`)
        continue
      }

      // Apply migration
      console.log(`🔄 Applying ${file}.`)
      const migrationSql = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8',
      )

      await client.query(migrationSql)

      await client.query(
        'INSERT INTO public.migrations (version) VALUES ($1)',
        [version],
      )

      console.log(`✅ Applied ${file}.`)
    }

    console.log('All migrations applied successfully.')
    exitCode = 0
  }
  catch (error) {
    console.error('Migration failed:', error)
  }
  finally {
    await client.end()
    process.exit(exitCode)
  }
})()
