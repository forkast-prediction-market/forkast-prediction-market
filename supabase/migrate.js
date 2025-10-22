#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const postgres = require('postgres')

async function applyMigrations(sql) {
  console.log('Applying migrations...')

  console.log('Creating migrations tracking table...')
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;

    DO
    $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_migrations' AND tablename = 'migrations') THEN
          CREATE POLICY "service_role_all_migrations" ON migrations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
        END IF;
      END
    $$;
  `, [], { simple: true })
  console.log('Migrations table ready')

  const migrationsDir = path.join(__dirname, './migrations')
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  console.log(`Found ${migrationFiles.length} migration files`)

  for (const file of migrationFiles) {
    const version = file.replace('.sql', '')

    const result = await sql`
      SELECT version FROM migrations WHERE version = ${version}
    `

    if (result.length > 0) {
      console.log(`⏭️ Skipping ${file} (already applied)`)
      continue
    }

    console.log(`🔄 Applying ${file}`)
    const migrationSql = fs.readFileSync(
      path.join(migrationsDir, file),
      'utf8',
    )

    await sql.begin(async (tx) => {
      await tx.unsafe(migrationSql, [], { simple: true })
      await tx`INSERT INTO migrations (version) VALUES (${version})`
    })

    console.log(`✅ Applied ${file}`)
  }

  console.log('✅ All migrations applied successfully')
}

async function createSyncEventsCron(sql) {
  console.log('Creating sync-events cron job...')
  const sqlQuery = `
  DO $$
  DECLARE
    job_id int;
    cmd text := $c$
      DELETE FROM cron.job_run_details
      WHERE start_time < now() - interval '3 days';

      SELECT net.http_get(
        url := 'https://<<VERCEL_URL>>/api/sync/events',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer <<CRON_SECRET>>"}'
      );
    $c$;
  BEGIN
    SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'sync-events';

    IF job_id IS NOT NULL THEN
      PERFORM cron.unschedule(job_id);
    END IF;

    PERFORM cron.schedule('sync-events', '*/5 * * * *', cmd);
  END $$;`

  const updatedSQL = sqlQuery
    .replace('<<VERCEL_URL>>', process.env.VERCEL_PROJECT_PRODUCTION_URL)
    .replace('<<CRON_SECRET>>', process.env.CRON_SECRET)

  await sql.unsafe(updatedSQL, [], { simple: true })
  console.log('✅ Cron sync-events created successfully')
}

async function run() {
  const requiredEnvVars = ['POSTGRES_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'CRON_SECRET']
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`ERROR: Required environment variable ${envVar} is not set.`)
      process.exit(1)
    }
  }

  const connectionString = process.env.POSTGRES_URL.replace('require', 'disable')
  const sql = postgres(connectionString)

  try {
    console.log('Connecting to database...')
    await sql`SELECT 1`
    console.log('Connected to database successfully')

    await applyMigrations(sql)
    await createSyncEventsCron(sql)
  }
  catch (error) {
    console.error('An error occurred:', error)
    process.exit(1)
  }
  finally {
    console.log('Closing database connection...')
    await sql.end()
    console.log('Connection closed.')
  }
}

run()
