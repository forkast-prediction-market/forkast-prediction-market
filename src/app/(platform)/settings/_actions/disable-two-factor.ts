'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { UserRepository } from '@/lib/db/queries/user'

export async function disableTwoFactorAction() {
  const user = await UserRepository.getCurrentUser()
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  try {
    const h = await headers()

    return await auth.api.disableTwoFactor({
      body: {
        password: user.address,
      },
      headers: h,
    })
  }
  catch (error) {
    console.error('Failed to disable two-factor:', error)
    return { error: 'Failed to disable two-factor' }
  }
}
