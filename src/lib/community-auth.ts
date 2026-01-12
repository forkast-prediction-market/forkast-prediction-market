const STORAGE_KEY = 'community_auth'

interface StoredCommunityAuth {
  token: string
  address: string
  expires_at: string
}

function isExpired(expiresAt: string) {
  const timestamp = Date.parse(expiresAt)
  if (Number.isNaN(timestamp)) {
    return true
  }
  return timestamp <= Date.now()
}

export function getCommunityApiUrl() {
  return process.env.NEXT_PUBLIC_COMMUNITY_URL || 'https://community.kuest.com'
}

export function loadCommunityAuth(address?: string) {
  if (typeof window === 'undefined') {
    return null
  }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as StoredCommunityAuth
    if (!parsed?.token || !parsed?.address || !parsed?.expires_at) {
      return null
    }
    if (address && parsed.address.toLowerCase() !== address.toLowerCase()) {
      return null
    }
    if (isExpired(parsed.expires_at)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  }
  catch {
    return null
  }
}

export function storeCommunityAuth(auth: StoredCommunityAuth) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function clearCommunityAuth() {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(STORAGE_KEY)
}
