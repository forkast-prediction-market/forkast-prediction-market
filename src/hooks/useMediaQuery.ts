import { useLayoutEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useLayoutEffect(() => {
    if (typeof window === 'undefined')
      return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return matches
}
