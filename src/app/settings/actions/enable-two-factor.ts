'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function enableTwoFactorAction() {
  try {
    const h = await headers()
    const password = randomBytes(32).toString('base64url')

    await auth.api.setPassword({
      body: { newPassword: password },
      headers: h,
    })

    return await auth.api.enableTwoFactor({
      body: {
        password,
      },
      headers: h,
    })
  }
  catch (error) {
    console.error('Failed to enable TwoFactor Action', error)
    return { error: 'Failed to enable two factor' }
  }
}
