export function isCronAuthorized(header: string | null, cronSecret?: string): boolean {
  const secret = cronSecret ?? process.env.CRON_SECRET
  if (!secret) {
    return false
  }

  return header === `Bearer ${secret}`
}
