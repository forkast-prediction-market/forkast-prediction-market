import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)
const protectedPrefixes = ['/settings', '/portfolio', '/admin']

function getLocaleFromPathname(pathname: string) {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale
    }
  }
  return null
}

function stripLocale(pathname: string, locale: string | null) {
  if (!locale) {
    return pathname
  }
  const withoutLocale = pathname.slice(locale.length + 1)
  return withoutLocale.startsWith('/') ? withoutLocale : '/'
}

function withLocale(pathname: string, locale: string | null) {
  if (!locale) {
    return pathname
  }
  return pathname === '/' ? `/${locale}` : `/${locale}${pathname}`
}

export async function proxy(request: NextRequest) {
  const url = new URL(request.url)
  const locale = getLocaleFromPathname(url.pathname)
  const pathname = stripLocale(url.pathname, locale)
  const isProtected = protectedPrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (!isProtected) {
    return null
  }

  const hasTwoFactorCookie = Boolean(
    request.cookies.get('__Secure-better-auth.siwe_2fa_pending')
    ?? request.cookies.get('better-auth.siwe_2fa_pending'),
  )
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    if (hasTwoFactorCookie) {
      return NextResponse.redirect(new URL(withLocale('/2fa', locale), request.url))
    }
    return NextResponse.redirect(new URL(withLocale('/', locale), request.url))
  }

  if (pathname.startsWith('/admin')) {
    if (!session.user?.is_admin) {
      return NextResponse.redirect(new URL(withLocale('/', locale), request.url))
    }
  }

  return null
}

export default async function middleware(request: NextRequest) {
  const authResponse = await proxy(request)
  if (authResponse) {
    return authResponse
  }
  return intlMiddleware(request)
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
