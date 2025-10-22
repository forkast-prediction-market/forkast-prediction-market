'use server'

import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { UserRepository } from '@/lib/db/queries/user'

export async function enableTwoFactorAction() {
  const user = await UserRepository.getCurrentUser()
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  try {
    const h = await headers()

    await prepareAccount(user.address, h)

    return await auth.api.enableTwoFactor({
      body: {
        password: user.address,
      },
      headers: h,
    })
  }
  catch (error) {
    console.error('Failed to enable two-factor:', error)
    return { error: 'Failed to enable two-factor' }
  }
}

async function prepareAccount(newPassword: string, h: ReadonlyHeaders) {
  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: h,
    })
  }
  catch (error: any) {
    if (!error.toString().includes('user already has a password')) {
      throw error
    }
  }
}
