'use client'

import { siweClient, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [
    siweClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = '/2fa'
      },
    }),
  ],
})
