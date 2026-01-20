'use client'

import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/locales'
import { NextIntlClientProvider } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
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

function readCookieLocale(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

function resolveClientLocale(): Locale {
  const cookieLocale = readCookieLocale()
  if (isLocaleSupported(cookieLocale)) {
    return cookieLocale
  }

  const languages = typeof navigator !== 'undefined'
    ? navigator.languages ?? [navigator.language]
    : []

  for (const language of languages) {
    const normalized = language.toLowerCase()
    if (isLocaleSupported(normalized)) {
      return normalized
    }
    const base = normalized.split('-')[0]
    if (isLocaleSupported(base)) {
      return base
    }
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
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [messages, setMessages] = useState<Messages>(messagesByLocale[defaultLocale])

  useEffect(() => {
    const resolvedLocale = resolveClientLocale()
    if (resolvedLocale === locale) {
      return
    }

    setLocale(resolvedLocale)
    setMessages(messagesByLocale[resolvedLocale])
  }, [locale])

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
