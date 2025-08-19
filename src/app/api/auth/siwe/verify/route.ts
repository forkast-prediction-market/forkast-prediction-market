import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { message, signature, walletAddress } = await request.json()

    // Use Better Auth SIWE plugin to verify and sign in
    const result = await auth.api.verifySiweMessage({
      request,
      body: {
        message,
        signature,
        walletAddress,
      },
    })

    return NextResponse.json({
      success: result.success,
      user: result.user,
      token: result.token,
    })
  }
  catch (error) {
    console.error('Error verifying SIWE:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
