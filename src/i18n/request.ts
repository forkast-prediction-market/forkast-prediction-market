import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { defaultLocale, isLocaleSupported } from '@/i18n/locales'

async function resolveLocaleFromCookie() {
  const store = await cookies()
  const locale = store.get('NEXT_LOCALE')?.value
  return isLocaleSupported(locale) ? locale : null
}

async function resolveLocaleFromHeader() {
  const store = await headers()
  const header = store.get('accept-language')
  if (!header) {
    return null
  }

  const candidates = header
    .split(',')
    .map(part => part.trim().split(';')[0])
    .filter(Boolean)

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase()
    if (isLocaleSupported(normalized)) {
      return normalized
    }
    const base = normalized.split('-')[0]
    if (isLocaleSupported(base)) {
      return base
    }
  }

  return null
}

export default getRequestConfig(async () => {
  const locale = await resolveLocaleFromCookie()
    ?? await resolveLocaleFromHeader()
    ?? defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'America/New_York',
  }
})
