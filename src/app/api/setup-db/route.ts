import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getMigrationStatus, runMigrations } from '@/lib/migrations'

/**
 * 🛠️ Database Setup API Endpoint
 *
 * This endpoint initializes a fresh database for new Forkast forks.
 * It's designed to be called once during the initial deployment.
 *
 * Usage:
 * - GET /api/setup-db - Initialize database with all migrations
 * - GET /api/setup-db?check=true - Check if database is already initialized
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const checkOnly = searchParams.get('check') === 'true'

    // Check if database is already initialized
    const status = await getMigrationStatus()
    const isInitialized = status.currentVersion !== null

    if (checkOnly) {
      return NextResponse.json({
        success: true,
        initialized: isInitialized,
        currentVersion: status.currentVersion,
        totalMigrations: status.totalMigrations,
        pendingMigrations: status.pendingMigrations.length,
        message: isInitialized
          ? '✅ Database is already initialized'
          : '⚠️ Database needs initialization',
      })
    }

    // If already initialized, suggest using /api/migrate instead
    if (isInitialized) {
      return NextResponse.json({
        success: true,
        initialized: true,
        currentVersion: status.currentVersion,
        message: '✅ Database is already initialized. Use /api/migrate for updates.',
        suggestion: 'Use GET /api/migrate to apply any pending migrations',
      })
    }

    // Initialize database with all migrations
    console.log('🛠️ Initializing fresh database for new fork...')
    console.log('📊 This will apply all migrations from scratch')

    const result = await runMigrations()

    if (result.success) {
      console.log('✅ Database initialization completed successfully!')
      console.log(`📈 Applied ${result.appliedMigrations.length} migrations`)

      return NextResponse.json({
        ...result,
        initialized: true,
        message: `🎉 Database successfully initialized! Applied ${result.appliedMigrations.length} migrations.`,
      })
    }
    else {
      console.error('❌ Database initialization failed:', result.error)
      return NextResponse.json(result, { status: 500 })
    }
  }
  catch (error) {
    console.error('❌ Database setup error:', error)

    return NextResponse.json(
      {
        success: false,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ Database setup failed',
      },
      { status: 500 },
    )
  }
}

// POST endpoint for manual setup triggers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { force = false } = body

    // Check current status
    const status = await getMigrationStatus()
    const isInitialized = status.currentVersion !== null

    // Prevent accidental re-initialization unless forced
    if (isInitialized && !force) {
      return NextResponse.json({
        success: false,
        initialized: true,
        currentVersion: status.currentVersion,
        error: 'Database already initialized',
        message: '⚠️ Database is already initialized. Use force: true to reinitialize (dangerous!)',
      }, { status: 400 })
    }

    if (force && isInitialized) {
      console.log('⚠️ FORCED RE-INITIALIZATION REQUESTED')
      console.log('🔄 This will reset the entire database!')
    }

    // Run initialization
    console.log('🛠️ Setting up database...')
    const result = await runMigrations()

    return NextResponse.json({
      ...result,
      initialized: result.success,
      forced: force && isInitialized,
    })
  }
  catch (error) {
    console.error('❌ Database setup POST error:', error)

    return NextResponse.json(
      {
        success: false,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ Database setup POST failed',
      },
      { status: 500 },
    )
  }
}
