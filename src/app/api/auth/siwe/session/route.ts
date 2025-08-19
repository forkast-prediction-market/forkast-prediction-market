import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get wallet address from user accounts (SIWE stores it there)
    const walletAddress = session.user.email
      || (session.user as any).walletAddress

    return NextResponse.json({
      address: walletAddress,
      isAuthenticated: true,
      user: session.user,
      session: session.session,
    })
  }
  catch {
    return NextResponse.json({ error: 'Session error' }, { status: 500 })
  }
}
