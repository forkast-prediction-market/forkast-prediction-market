export const locales = ['en', 'es'] as const
export type Locale = typeof locales[number]

export const defaultLocale: Locale = 'en'

export function isLocaleSupported(value?: string | null): value is Locale {
  if (!value) {
    return false
  }
  return locales.includes(value as Locale)
}
