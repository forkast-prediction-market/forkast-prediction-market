import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'de', 'es', 'pt', 'fr', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})
