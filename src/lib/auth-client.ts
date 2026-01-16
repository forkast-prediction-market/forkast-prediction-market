'use client'

import { siweClient, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [
    siweClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        if (typeof window === 'undefined') {
          return
        }

        try {
          const intent = window.sessionStorage.getItem('auth:siwe-intent')
          const intentTime = intent ? Number(intent) : Number.NaN
          const isFreshIntent = Number.isFinite(intentTime) && Date.now() - intentTime < 5 * 60 * 1000

          if (!isFreshIntent) {
            return
          }

          window.sessionStorage.removeItem('auth:siwe-intent')
          window.location.href = '/2fa'
        }
        catch {
          window.location.href = '/2fa'
        }
      },
    }),
  ],
})
