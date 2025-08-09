'use client'

import { createContext, useLayoutEffect, useMemo, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'dark' | 'light'
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'dark' | 'light'>('light')
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null
      if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
        setTheme(savedTheme)
      }
    }
    catch {}
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!mounted)
      return

    function updateActualTheme() {
      const resolvedTheme
        = theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme

      setActualTheme(resolvedTheme)

      const root = document.documentElement
      root.classList.toggle('dark', resolvedTheme === 'dark')

      try {
        localStorage.setItem('theme', theme)
      }
      catch {
        // ignore localStorage errors
      }
    }

    updateActualTheme()

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', updateActualTheme)
      return () => mediaQuery.removeEventListener('change', updateActualTheme)
    }
  }, [theme, mounted])

  const value = useMemo(() => ({
    theme,
    setTheme,
    actualTheme,
  }), [theme, setTheme, actualTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}
