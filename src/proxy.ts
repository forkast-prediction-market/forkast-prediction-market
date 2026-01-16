import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const hasTwoFactorCookie = Boolean(
    request.cookies.get('__Secure-better-auth.siwe_2fa_pending')
    ?? request.cookies.get('better-auth.siwe_2fa_pending'),
  )
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    if (hasTwoFactorCookie) {
      return NextResponse.redirect(new URL('/2fa', request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  const url = new URL(request.url)
  if (url.pathname.startsWith('/admin')) {
    if (!session.user?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/settings/:path*', '/portfolio/:path*', '/admin/:path*'],
}
