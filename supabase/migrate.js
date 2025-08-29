#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')

async function applyMigrations() {
  // Check if database connection string is configured
  // For migrations, we need a connection with full privileges
  const connectionString = process.env.POSTGRES_URL

  if (!connectionString) {
    console.error('ERROR: No database connection string found')
    console.log('Please configure POSTGRES_URL')
    process.exit(1)
  }

  console.log('Database connection configured, connecting with admin privileges...')

  const client = new Client({
    connectionString,
  })

  try {
    await client.connect()
    console.log('Connected to database successfully')

    console.log('Creating migrations tracking table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.supabase_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('Migrations table ready')

    const migrationsDir = path.join(__dirname, '../../../supabase/migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    console.log(`Found ${migrationFiles.length} migration files`)

    for (const file of migrationFiles) {
      const version = file.replace('.sql', '')

      const result = await client.query(
        'SELECT version FROM public.supabase_migrations WHERE version = $1',
        [version],
      )

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already applied)`)
        continue
      }

      console.log(`🔄 Applying ${file}`)
      const migrationSql = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8',
      )

      await client.query(migrationSql)

      // Record migration as applied
      await client.query(
        'INSERT INTO public.supabase_migrations (version) VALUES ($1)',
        [version],
      )

      console.log(`✅ Applied ${file}`)
    }

    console.log('All migrations applied successfully')
  }
  catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
  finally {
    await client.end()
  }
}

applyMigrations()
