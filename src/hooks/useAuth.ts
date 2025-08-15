import { useEffect, useState } from 'react'

export type AuthProvider = 'magic' | 'google' | 'metamask' | 'coinbase'

export interface User {
  address?: string
  email?: string
  walletType?: AuthProvider
  isConnected: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  async function fetchUser() {
    try {
      const res = await fetch('/api/me', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setUser({ ...json, isConnected: true })
      }
      else {
        setUser(null)
      }
    }
    catch (err) {
      console.error('Error fetching user:', err)
      setUser(null)
    }
    finally {
      setIsInitialized(true)
    }
  }

  useEffect(() => {
    fetchUser()
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
        console.log(json)
        setUser({ ...json, isConnected: true })
      }
    }
    catch (err) {
      console.error('Login error:', err)
      setUser(null)
      throw err
    }
  }

  async function logout() {
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        setUser(null)
      }
    }
    catch (err) {
      console.error('Logout error:', err)
    }
  }

  return { user, isInitialized, login, logout }
}
