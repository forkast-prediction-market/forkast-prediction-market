import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)
const protectedPrefixes = ['/settings', '/portfolio', '/admin']
type Locale = (typeof routing.locales)[number]

function isLocale(value: string): value is Locale {
  return routing.locales.includes(value as Locale)
}

function getLocaleFromPathname(pathname: string): Locale | null {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale
    }
  }
  return null
}

function getLocaleFromCookie(request: NextRequest): Locale | null {
  const locale = request.cookies.get('NEXT_LOCALE')?.value
  if (locale && isLocale(locale)) {
    return locale
  }
  return null
}

function getLocaleFromAcceptLanguage(headerValue: string | null): Locale | null {
  if (!headerValue) {
    return null
  }
  const candidates = headerValue
    .split(',')
    .map((value) => {
      const [tag, qValue] = value.trim().toLowerCase().split(';q=')
      if (!tag) {
        return null
      }
      const q = qValue ? Number(qValue) : 1
      return { tag, q: Number.isNaN(q) ? 0 : q }
    })
    .filter((candidate): candidate is { tag: string, q: number } => Boolean(candidate))
    .sort((a, b) => b.q - a.q)

  for (const candidate of candidates) {
    if (isLocale(candidate.tag)) {
      return candidate.tag
    }
    const base = candidate.tag.split('-')[0]
    if (isLocale(base)) {
      return base
    }
  }

  return null
}

function resolveRequestLocale(request: NextRequest, pathnameLocale: Locale | null): Locale {
  return (
    pathnameLocale
    ?? getLocaleFromCookie(request)
    ?? getLocaleFromAcceptLanguage(request.headers.get('accept-language'))
    ?? routing.defaultLocale
  )
}

function stripLocale(pathname: string, locale: Locale | null) {
  if (!locale) {
    return pathname
  }
  const withoutLocale = pathname.slice(locale.length + 1)
  return withoutLocale.startsWith('/') ? withoutLocale : '/'
}

function withLocale(pathname: string, locale: Locale | null) {
  if (!locale || locale === routing.defaultLocale) {
    return pathname
  }
  return pathname === '/' ? `/${locale}` : `/${locale}${pathname}`
}

export default async function proxy(request: NextRequest) {
  const url = new URL(request.url)
  const pathnameLocale = getLocaleFromPathname(url.pathname)
  const pathname = stripLocale(url.pathname, pathnameLocale)
  const locale = resolveRequestLocale(request, pathnameLocale)
  const isProtected = protectedPrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (!isProtected) {
    return intlMiddleware(request)
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

  return intlMiddleware(request)
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
