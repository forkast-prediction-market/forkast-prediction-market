import { Pool } from 'pg'
import Postgrator from 'postgrator'

/**
 * 🔄 Database Migration System using Postgrator
 *
 * This module provides intelligent database migrations for Forkast prediction market forks.
 * It automatically detects and runs pending migrations from the /migrations folder.
 */

interface MigrationResult {
  success: boolean
  appliedMigrations: any[]
  error?: string
  message: string
}

class ForkastMigrations {
  private postgrator: Postgrator
  private pool: Pool

  constructor() {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })

    // Initialize Postgrator with custom execQuery
    this.postgrator = new Postgrator({
      migrationPattern: './migrations/*',
      driver: 'pg',
      schemaTable: 'schema_migrations', // Table to track migrations
      execQuery: async (query: string) => {
        const client = await this.pool.connect()
        try {
          const result = await client.query(query)
          return { rows: result.rows }
        }
        finally {
          client.release()
        }
      },
    })
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<MigrationResult> {
    try {
      console.log('🚀 Starting database migration process...')

      // Get current database version
      const currentVersion = await this.getCurrentVersion()
      console.log(`📊 Current database version: ${currentVersion || 'not initialized'}`)

      // Run migrations to latest version
      const appliedMigrations = await this.postgrator.migrate()

      if (appliedMigrations.length === 0) {
        return {
          success: true,
          appliedMigrations: [],
          message: '✅ Database is already up to date - no migrations needed',
        }
      }

      console.log(`✅ Successfully applied ${appliedMigrations.length} migrations:`)
      appliedMigrations.forEach((migration) => {
        console.log(`  - ${migration.name}`)
      })

      return {
        success: true,
        appliedMigrations,
        message: `✅ Successfully applied ${appliedMigrations.length} migrations`,
      }
    }
    catch (error) {
      console.error('❌ Migration failed:', error)
      return {
        success: false,
        appliedMigrations: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ Migration failed - check logs for details',
      }
    }
  }

  /**
   * Get current database version
   */
  async getCurrentVersion(): Promise<string | null> {
    try {
      const version = await this.postgrator.getDatabaseVersion()
      return version?.toString() || null
    }
    catch {
      console.log('📝 Schema migrations table does not exist yet - first run')
      return null
    }
  }

  /**
   * Get list of pending migrations
   */
  async getPendingMigrations(): Promise<any[]> {
    try {
      const currentVersion = await this.getCurrentVersion()
      const allMigrations = await this.postgrator.getMigrations()

      if (!currentVersion) {
        return allMigrations
      }

      return allMigrations.filter(migration =>
        Number.parseInt(migration.version.toString()) > Number.parseInt(currentVersion),
      )
    }
    catch (error) {
      console.error('Error getting pending migrations:', error)
      return []
    }
  }

  /**
   * Rollback to specific version
   */
  async rollback(targetVersion: string = '0'): Promise<MigrationResult> {
    try {
      console.log(`🔄 Rolling back to version ${targetVersion}...`)

      const appliedMigrations = await this.postgrator.migrate(targetVersion)

      return {
        success: true,
        appliedMigrations,
        message: `✅ Successfully rolled back to version ${targetVersion}`,
      }
    }
    catch (error) {
      console.error('❌ Rollback failed:', error)
      return {
        success: false,
        appliedMigrations: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ Rollback failed - check logs for details',
      }
    }
  }

  /**
   * Get migration status info
   */
  async getStatus(): Promise<{
    currentVersion: string | null
    pendingMigrations: any[]
    totalMigrations: number
  }> {
    const currentVersion = await this.getCurrentVersion()
    const pendingMigrations = await this.getPendingMigrations()
    const allMigrations = await this.postgrator.getMigrations()

    return {
      currentVersion,
      pendingMigrations,
      totalMigrations: allMigrations.length,
    }
  }

  /**
   * Validate database connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect()
      await client.query('SELECT 1')
      client.release()
      return true
    }
    catch (error) {
      console.error('❌ Database connection failed:', error)
      return false
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end()
  }
}

// Singleton instance
let migrations: ForkastMigrations | null = null

/**
 * Get the migrations instance
 */
export function getMigrations(): ForkastMigrations {
  if (!migrations) {
    migrations = new ForkastMigrations()
  }
  return migrations
}

/**
 * Run migrations (main function for API endpoints)
 */
export async function runMigrations(): Promise<MigrationResult> {
  const migrator = getMigrations()

  // Validate connection first
  const isConnected = await migrator.validateConnection()
  if (!isConnected) {
    return {
      success: false,
      appliedMigrations: [],
      error: 'Database connection failed',
      message: '❌ Cannot connect to database - check your POSTGRES_URL environment variable',
    }
  }

  return await migrator.migrate()
}

/**
 * Get migration status
 */
export async function getMigrationStatus() {
  const migrator = getMigrations()
  return await migrator.getStatus()
}

/**
 * Rollback migrations
 */
export async function rollbackMigrations(targetVersion: string = '0'): Promise<MigrationResult> {
  const migrator = getMigrations()
  return await migrator.rollback(targetVersion)
}
