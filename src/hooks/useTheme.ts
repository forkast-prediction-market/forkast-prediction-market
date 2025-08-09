'use client'

import { use } from 'react'
import { ThemeContext } from '@/components/layout/ThemeProvider'

export function useTheme() {
  const context = use(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
