const requiredEnvVars = ['VERCEL_PROJECT_PRODUCTION_URL', 'CRON_SECRET']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: Required environment variable ${envVar} is not set.`)
    process.exit(1)
  }
}

fetch(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/sync-events`, {
  headers: {
    Authorization: `Bearer ${process.env.CRON_SECRET}`,
  },
})
