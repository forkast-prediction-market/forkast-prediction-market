'use client'

import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/locales'
import { NextIntlClientProvider } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { defaultLocale, isLocaleSupported } from '@/i18n/locales'
import enMessages from '@/i18n/messages/en.json'
import esMessages from '@/i18n/messages/es.json'

interface IntlProviderProps {
  children: ReactNode
}

type Messages = typeof enMessages

const messagesByLocale: Record<Locale, Messages> = {
  en: enMessages,
  es: esMessages,
}

function resolveLocaleFromPathname(pathname: string | null): Locale {
  if (!pathname) {
    return defaultLocale
  }

  const [, candidate] = pathname.split('/')
  if (isLocaleSupported(candidate)) {
    return candidate
  }

  return defaultLocale
}

interface LocaleHtmlLangSyncProps {
  locale: string
}

function LocaleHtmlLangSync({ locale }: LocaleHtmlLangSyncProps) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return <></>
}

export default function IntlProvider({ children }: IntlProviderProps) {
  const pathname = usePathname()
  const locale = useMemo(() => resolveLocaleFromPathname(pathname), [pathname])
  const messages = messagesByLocale[locale]

  const timeZone = useMemo(() => {
    if (typeof Intl === 'undefined') {
      return 'America/New_York'
    }

    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  }, [])

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <LocaleHtmlLangSync locale={locale} />
      {children}
    </NextIntlClientProvider>
  )
}
