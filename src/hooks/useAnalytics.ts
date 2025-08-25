'use client'

import { useCallback } from 'react'

declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

export function useAnalytics() {
  const trackEvent = useCallback((
    action: string,
    category: string,
    label?: string,
    value?: number,
  ) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value,
      })
    }
  }, [])

  const trackPageView = useCallback((url: string, title?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS, {
        page_title: title || document.title,
        page_location: url,
      })
    }
  }, [])

  return {
    trackEvent,
    trackPageView,
  }
}
