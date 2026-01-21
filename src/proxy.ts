import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { defaultLocale, locales } from '@/i18n/locales'
import { auth } from '@/lib/auth'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false,
})

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/en(\/|$)/, '/')
    return NextResponse.redirect(url)
  }

  const intlResponse = intlMiddleware(request)

  if (pathname.startsWith('/settings') || pathname.startsWith('/portfolio') || pathname.startsWith('/admin')) {
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

    if (pathname.startsWith('/admin') && !session.user?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
