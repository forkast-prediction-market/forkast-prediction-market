import { Magic } from 'magic-sdk'
import { useMemo } from 'react'

let magicSingleton: Magic | null = null

export function useMagic(): Magic | null {
  return useMemo(() => {
    if (!process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY) {
      console.error('Magic API key is required')
      return null
    }

    if (!magicSingleton) {
      try {
        magicSingleton = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY)
      }
      catch (err) {
        console.error('Failed to initialize Magic:', err)
        return null
      }
    }

    return magicSingleton
  }, [])
}
