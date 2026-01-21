import type { ReactNode } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { isLocaleSupported, locales } from '@/i18n/locales'

export function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const resolvedParams = await params

  if (!isLocaleSupported(resolvedParams.locale)) {
    notFound()
  }

  setRequestLocale(resolvedParams.locale)
  return children
}
