import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    await auth.api.signOut({
      headers: request.headers,
    })

    return NextResponse.json({ success: true })
  }
  catch (error) {
    console.error('Error signing out:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
