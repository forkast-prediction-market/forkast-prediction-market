'use client'

import { useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/stores/useUser'

export default function UserInitializer() {
  const setUser = useUser.setState

  useEffect(() => {
    async function initializeUser() {
      try {
        const session = await authClient.getSession()
        if (session?.data?.user) {
          setUser(session.data.user)
        }
      }
      catch (error) {
        console.error('Failed to initialize user:', error)
      }
    }

    initializeUser()
  }, [setUser])

  return null
}
