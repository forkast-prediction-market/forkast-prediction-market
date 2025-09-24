'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { UserModel } from '@/lib/db/users'

export async function disableTwoFactorAction() {
  const user = await UserModel.getCurrentUser()
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
