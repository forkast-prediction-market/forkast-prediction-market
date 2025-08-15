import { Magic } from 'magic-sdk'
import { useMemo } from 'react'
import { useAuth } from './useAuth'

let magicSingleton: Magic | null = null

export function useMagic() {
  const { login, logout } = useAuth()

  const magic = useMemo(() => {
    if (typeof window === 'undefined') {
      return null
    }

    if (!process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY) {
      console.error('Magic API key is required')
      return null
    }

    if (!magicSingleton) {
      try {
        magicSingleton = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY)
      }
      catch (err) {
        console.error('Failed to initialize Magic:', err)
        return null
      }
    }
    return magicSingleton
  }, [])

  async function loginWithEmailOTP(email: string) {
    if (!magic) {
      throw new Error('Magic not initialized')
    }

    const didToken = await magic.auth.loginWithEmailOTP({ email })
    if (!didToken) {
      throw new Error('Magic not initialized')
    }

    await login('magic', didToken)
  }

  async function disconnect() {
    if (!magic) {
      throw new Error('Magic not initialized')
    }

    const isLoggedIn = await magic.user.isLoggedIn()
    if (isLoggedIn) {
      magic.user.logout()
    }

    await logout()
  }

  return { magic, loginWithEmailOTP, disconnect }
}
