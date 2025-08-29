#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')

async function applyMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Connected to database')

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS supabase_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../supabase/migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    console.log(`Found ${migrationFiles.length} migration files`)

    for (const file of migrationFiles) {
      const version = file.replace('.sql', '')

      // Check if migration already applied
      const result = await client.query(
        'SELECT version FROM supabase_migrations WHERE version = $1',
        [version],
      )

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already applied)`)
        continue
      }

      // Apply migration
      console.log(`🔄 Applying ${file}`)
      const migrationSql = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8',
      )

      await client.query(migrationSql)

      // Record migration as applied
      await client.query(
        'INSERT INTO supabase_migrations (version) VALUES ($1)',
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
