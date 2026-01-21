import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, isLocaleSupported } from '@/i18n/locales'

export default getRequestConfig(async ({ requestLocale }) => {
  const resolvedLocale = await requestLocale
  const locale = isLocaleSupported(resolvedLocale) ? resolvedLocale : defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'America/New_York',
  }
})
