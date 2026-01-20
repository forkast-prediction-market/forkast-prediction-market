import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTimeZone } from 'next-intl/server'
import LocaleHtmlLangSync from '@/components/LocaleHtmlLangSync'

interface IntlProviderProps {
  children: ReactNode
}

export default async function IntlProvider({ children }: IntlProviderProps) {
  const [locale, messages, timeZone] = await Promise.all([
    getLocale(),
    getMessages(),
    getTimeZone(),
  ])

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <LocaleHtmlLangSync locale={locale} />
      {children}
    </NextIntlClientProvider>
  )
}
