'use client'

import { useEffect } from 'react'

interface LocaleHtmlLangSyncProps {
  locale: string
}

export default function LocaleHtmlLangSync({ locale }: LocaleHtmlLangSyncProps) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
