import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { loadEnabledLocales } from '@/i18n/locale-settings'
import { routing } from '@/i18n/routing'

export default async function LocaleCatchAll({ params }: PageProps<'/[locale]/[...rest]'>) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const enabledLocales = await loadEnabledLocales()
  if (!enabledLocales.includes(locale)) {
    notFound()
  }

  notFound()
}
