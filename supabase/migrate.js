#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')

async function applyMigrations(client) {
  console.log('Applying migrations...')

  console.log('Creating migrations tracking table...')
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log('Migrations table ready')

  const migrationsDir = path.join(__dirname, './migrations')
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  console.log(`Found ${migrationFiles.length} migration files`)

  for (const file of migrationFiles) {
    const version = file.replace('.sql', '')

    const result = await client.query(
      'SELECT version FROM public.migrations WHERE version = $1',
      [version],
    )

    if (result.rows.length > 0) {
      console.log(`⏭️ Skipping ${file} (already applied)`)
      continue
    }

    console.log(`🔄 Applying ${file}`)
    const migrationSql = fs.readFileSync(
      path.join(migrationsDir, file),
      'utf8',
    )

    await client.query('BEGIN')
    try {
      await client.query(migrationSql)
      await client.query(
        'INSERT INTO public.migrations (version) VALUES ($1)',
        [version],
      )
      await client.query('COMMIT')
      console.log(`✅ Applied ${file}`)
    }
    catch (e) {
      await client.query('ROLLBACK')
      throw e
    }
  }

  console.log('✅ All migrations applied successfully')
}

async function createSyncEventsCron(client) {
  console.log('Creating sync-events cron job...')
  const sql = `
create extension if not exists pg_cron;
create extension if not exists pg_net;

DO $$
  DECLARE
    job_id int;
    cmd text := $c$
    SELECT net.http_get(
      url := 'https://<<VERCEL_URL>>/api/sync-events',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer <<CRON_SECRET>>"}'
    )
  $c$;
  BEGIN
    SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'sync-events';

    IF job_id IS NOT NULL THEN
      EXECUTE format('SELECT cron.unschedule(%s)', job_id);
    END IF;

    EXECUTE format('SELECT cron.schedule(%L, %L, %L)', 'sync-events', '*/15 * * * *', cmd);
  END $$;`

  const updatedSQL = sql
    .replace('<<VERCEL_URL>>', process.env.VERCEL_PROJECT_PRODUCTION_URL)
    .replace('<<CRON_SECRET>>', process.env.CRON_SECRET)

  await client.query(updatedSQL)
  console.log('✅ Cron sync-events created successfully')
}

async function run() {
  const connectionString = process.env.POSTGRES_URL
  if (!connectionString) {
    console.error('ERROR: No database connection string found. Please set POSTGRES_URL.')
    process.exit(1)
  }

  const client = new Client({ connectionString })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Connected to database successfully')

    await applyMigrations(client)
    await createSyncEventsCron(client)
  }
  catch (error) {
    console.error('An error occurred:', error)
    process.exit(1)
  }
  finally {
    console.log('Closing database connection...')
    await client.end()
    console.log('Connection closed.')
  }
}

run()
