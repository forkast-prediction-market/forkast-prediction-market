const adminWallets = (() => {
  const value = process.env.NEXT_PUBLIC_ADMIN_WALLETS?.trim()

  if (!value) {
    return [] as string[]
  }

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).toLowerCase())
    }
  }
  catch {
    // Not JSON, fallback to comma-separated list
  }

  return value
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
})()

export function isAdminWalletClient(address?: string | null): boolean {
  if (!address) {
    return false
  }

  return adminWallets.includes(address.toLowerCase())
}
