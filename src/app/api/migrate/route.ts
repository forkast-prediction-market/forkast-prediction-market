import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getMigrationStatus, rollbackMigrations, runMigrations } from '@/lib/migrations'

/**
 * 🔄 Database Migration API Endpoint
 *
 * This endpoint handles database migrations for Forkast prediction market forks.
 * It can be called manually or via Vercel cron jobs to keep the database up to date.
 *
 * Usage:
 * - GET /api/migrate - Run pending migrations
 * - GET /api/migrate?status=true - Get migration status
 * - GET /api/migrate?rollback=version - Rollback to specific version
 * - GET /api/migrate?dry_run=true - Show pending migrations without applying
 */

export async function GET(request: NextRequest) {
  try {
    // Security: Check for cron secret in production
    if (process.env.NODE_ENV === 'production') {
      const auth = request.headers.get('authorization')
      if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
          { error: 'Unauthorized - invalid cron secret' },
          { status: 401 },
        )
      }
    }

    const searchParams = request.nextUrl.searchParams
    const statusOnly = searchParams.get('status') === 'true'
    const dryRun = searchParams.get('dry_run') === 'true'
    const rollbackVersion = searchParams.get('rollback')

    // Handle status request
    if (statusOnly) {
      const status = await getMigrationStatus()
      return NextResponse.json({
        success: true,
        status,
        message: 'Migration status retrieved successfully',
      })
    }

    // Handle rollback request
    if (rollbackVersion) {
      console.log(`🔄 Rollback requested to version: ${rollbackVersion}`)
      const result = await rollbackMigrations(rollbackVersion)
      return NextResponse.json(result)
    }

    // Handle dry run request
    if (dryRun) {
      const status = await getMigrationStatus()
      return NextResponse.json({
        success: true,
        pendingMigrations: status.pendingMigrations,
        currentVersion: status.currentVersion,
        message: `${status.pendingMigrations.length} migrations would be applied`,
        dryRun: true,
      })
    }

    // Run actual migrations
    console.log('🚀 Running database migrations...')
    const result = await runMigrations()

    // Log result for monitoring
    if (result.success) {
      console.log(`✅ Migration completed: ${result.message}`)
    }
    else {
      console.error(`❌ Migration failed: ${result.error}`)
    }

    return NextResponse.json(result)
  }
  catch (error) {
    console.error('❌ Migration endpoint error:', error)

    return NextResponse.json(
      {
        success: false,
        appliedMigrations: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ Migration endpoint failed',
      },
      { status: 500 },
    )
  }
}

// POST endpoint for manual triggers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, version } = body

    switch (action) {
      case 'migrate': {
        const result = await runMigrations()
        return NextResponse.json(result)
      }

      case 'rollback': {
        if (!version) {
          return NextResponse.json(
            { error: 'Version required for rollback' },
            { status: 400 },
          )
        }
        const rollbackResult = await rollbackMigrations(version)
        return NextResponse.json(rollbackResult)
      }

      case 'status': {
        const status = await getMigrationStatus()
        return NextResponse.json({
          success: true,
          status,
          message: 'Status retrieved successfully',
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: migrate, rollback, or status' },
          { status: 400 },
        )
    }
  }
  catch (error) {
    console.error('❌ Migration POST error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ Migration POST failed',
      },
      { status: 500 },
    )
  }
}
