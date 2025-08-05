import { useCallback, useEffect, useState } from 'react'

export interface SearchResult {
  id: number
  eventSlug: string
  marketSlug: string
  eventTitle: string
  marketTitle: string
  iconUrl: string | null
  percentage: number
  displayText: string
  outcomeCount: number
  isMultipleMarkets: boolean
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data)
        setShowResults(true)
      }
      else {
        setResults([])
        setShowResults(false)
      }
    }
    catch (error) {
      console.error('Search error:', error)
      setResults([])
      setShowResults(false)
    }
    finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, search])

  function handleQueryChange(newQuery: string) {
    setQuery(newQuery)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  function hideResults() {
    setShowResults(false)
  }

  return {
    query,
    results,
    isLoading,
    showResults,
    handleQueryChange,
    clearSearch,
    hideResults,
  }
}
