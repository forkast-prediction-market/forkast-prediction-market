'use server'

import { auth } from '@/lib/auth'

export async function verifyTotp(formData: FormData) {
  try {
    const code = formData.get('code') as string

    await auth.api.verifyTOTP({
      body: {
        code,
        trustDevice: formData.get('trus_device') === 'on',
      },
    })
  }
  catch (error) {
    console.error('Failed to enable TwoFactor Action', error)
    return { error: 'Failed to enable two factor' }
  }
}
