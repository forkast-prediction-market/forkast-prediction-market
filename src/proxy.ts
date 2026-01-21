import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { defaultLocale, isLocaleSupported, locales } from '@/i18n/locales'
import { auth } from '@/lib/auth'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false,
})

function resolveLocaleFromPathname(pathname: string) {
  const [, candidate] = pathname.split('/')
  return isLocaleSupported(candidate) ? candidate : null
}

function stripLocalePrefix(pathname: string, locale: string | null) {
  if (!locale) {
    return pathname
  }

  return pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '')
}

function withLocalePrefix(pathname: string, locale: string | null) {
  const prefix = locale && locale !== defaultLocale ? `/${locale}` : ''
  return `${prefix}${pathname}`
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const locale = resolveLocaleFromPathname(pathname)

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/en(\/|$)/, '/')
    return NextResponse.redirect(url)
  }

  const intlResponse = intlMiddleware(request)
  const normalizedPathname = stripLocalePrefix(pathname, locale)

  if (
    normalizedPathname.startsWith('/settings')
    || normalizedPathname.startsWith('/portfolio')
    || normalizedPathname.startsWith('/admin')
  ) {
    const hasTwoFactorCookie = Boolean(
      request.cookies.get('__Secure-better-auth.siwe_2fa_pending')
      ?? request.cookies.get('better-auth.siwe_2fa_pending'),
    )
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      if (hasTwoFactorCookie) {
        return NextResponse.redirect(new URL(withLocalePrefix('/2fa', locale), request.url))
      }
      return NextResponse.redirect(new URL(withLocalePrefix('/', locale), request.url))
    }

    if (normalizedPathname.startsWith('/admin') && !session.user?.is_admin) {
      return NextResponse.redirect(new URL(withLocalePrefix('/', locale), request.url))
    }
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
