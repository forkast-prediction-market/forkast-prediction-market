import type { AuthProvider } from '@/types'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/stores/useUser'

export function useAuth() {
  async function fetchUser() {
    try {
      const res = await fetch('/api/me', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        useUser.setState(json)
      }
      else {
        useUser.setState(null)
      }
    }
    catch {
      toast.error('Sorry, something went wrong when fetching user.')
      useUser.setState(null)
    }
  }

  useEffect(() => {
    fetchUser().catch(() => {})
  }, [])

  async function login(provider: AuthProvider, token: string) {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ provider, token }),
      })

      if (res.ok) {
        const json = await res.json()
        useUser.setState(json)
      }
    }
    catch {
      toast.error('Sorry, something went wrong.')
      useUser.setState(null)
    }
  }

  async function logout() {
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        useUser.setState(null)
      }
    }
    catch {
      toast.error('Sorry, something went wrong.')
    }
  }

  return { login, logout }
}
