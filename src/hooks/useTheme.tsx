'use client'

import { createContext, use, useCallback, useLayoutEffect, useMemo, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  actualTheme: 'dark' | 'light' // The actual resolved theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'dark' | 'light'>('light')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage on mount
  useLayoutEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system')) {
        setTheme(savedTheme)
      }
      else {
        setTheme('system')
      }
    }
    catch {
      // localStorage not available, keep default
      setTheme('system')
    }
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!mounted)
      return

    function updateActualTheme() {
      let resolvedTheme: 'dark' | 'light'

      if (theme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light'
      }
      else {
        resolvedTheme = theme as 'dark' | 'light'
      }

      setActualTheme(resolvedTheme)

      // Apply theme to html element
      const root = window.document.documentElement
      if (resolvedTheme === 'dark') {
        root.classList.add('dark')
      }
      else {
        root.classList.remove('dark')
      }

      // Save theme preference
      try {
        localStorage.setItem('theme', theme)
      }
      catch {
        // localStorage not available
      }
    }

    updateActualTheme()

    // Listen for system theme changes only if theme is "system"
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', updateActualTheme)
      return () => mediaQuery.removeEventListener('change', updateActualTheme)
    }
  }, [theme, mounted])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      if (prev === 'light')
        return 'dark'
      if (prev === 'dark')
        return 'system'
      return 'light'
    })
  }, [])

  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme,
    actualTheme,
  }), [theme, toggleTheme, setTheme, actualTheme])

  return (
    <ThemeContext value={contextValue}>
      {children}
    </ThemeContext>
  )
}

export function useTheme() {
  const context = use(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
