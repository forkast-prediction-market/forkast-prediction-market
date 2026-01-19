import { NextResponse } from 'next/server'
import { defaultLocale, isLocaleSupported } from '@/i18n/locales'

export async function POST(request: Request) {
  let locale = defaultLocale

  try {
    const body = await request.json()
    if (isLocaleSupported(body?.locale)) {
      locale = body.locale
    }
  }
  catch {
    locale = defaultLocale
  }

  const response = NextResponse.json({ locale })
  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
}
