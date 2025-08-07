'use client'

import { useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'

export default function ThemeColor() {
  const { actualTheme } = useTheme()

  useEffect(() => {
    // Define colors that match CSS
    const colors = {
      light: '#ffffff', // oklch(1 0 0)
      dark: '#1e293b', // oklch(0.28 0.04 260)
    }

    const color = actualTheme === 'dark' ? colors.dark : colors.light

    // Update meta tag theme-color
    let themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta')
      themeColorMeta.setAttribute('name', 'theme-color')
      document.head.appendChild(themeColorMeta)
    }
    themeColorMeta.setAttribute('content', color)

    // Update meta tag msapplication-navbutton-color (IE/Edge)
    let msNavMeta = document.querySelector(
      'meta[name="msapplication-navbutton-color"]',
    )
    if (!msNavMeta) {
      msNavMeta = document.createElement('meta')
      msNavMeta.setAttribute('name', 'msapplication-navbutton-color')
      document.head.appendChild(msNavMeta)
    }
    msNavMeta.setAttribute('content', color)

    // Update meta tag apple-mobile-web-app-status-bar-style (iOS Safari)
    let appleMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    )
    if (!appleMeta) {
      appleMeta = document.createElement('meta')
      appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
      document.head.appendChild(appleMeta)
    }
    // For iOS, use 'default' for light and 'black-translucent' for dark
    appleMeta.setAttribute(
      'content',
      actualTheme === 'dark' ? 'black-translucent' : 'default',
    )
  }, [actualTheme])

  return null
}
