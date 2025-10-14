import type { SearchLoadingStates, SearchResults, UseSearchReturn } from '@/types'
import { useCallback, useEffect, useState } from 'react'

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({
    events: [],
    profiles: [],
  })
  const [isLoading, setIsLoading] = useState<SearchLoadingStates>({
    events: false,
    profiles: false,
  })
  const [showResults, setShowResults] = useState(false)
  const [activeTab, setActiveTab] = useState<'events' | 'profiles'>('events')

  const searchEvents = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(prev => ({ ...prev, events: [] }))
      return
    }

    setIsLoading(prev => ({ ...prev, events: true }))
    try {
      const response = await fetch(`/api/events/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setResults(prev => ({ ...prev, events: data }))
      }
      else {
        setResults(prev => ({ ...prev, events: [] }))
      }
    }
    catch (error) {
      console.error('Events search error:', error)
      setResults(prev => ({ ...prev, events: [] }))
    }
    finally {
      setIsLoading(prev => ({ ...prev, events: false }))
    }
  }, [])

  const searchProfiles = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(prev => ({ ...prev, profiles: [] }))
      return
    }

    setIsLoading(prev => ({ ...prev, profiles: true }))
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setResults(prev => ({ ...prev, profiles: data }))
      }
      else {
        setResults(prev => ({ ...prev, profiles: [] }))
      }
    }
    catch (error) {
      console.error('Profiles search error:', error)
      setResults(prev => ({ ...prev, profiles: [] }))
    }
    finally {
      setIsLoading(prev => ({ ...prev, profiles: false }))
    }
  }, [])

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults({ events: [], profiles: [] })
      setShowResults(false)
      return
    }

    // Execute both searches in parallel
    await Promise.all([
      searchEvents(searchQuery),
      searchProfiles(searchQuery),
    ])

    setShowResults(true)
  }, [searchEvents, searchProfiles])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, search])

  // Determine default tab based on results
  useEffect(() => {
    const hasEvents = results.events.length > 0 || isLoading.events
    const hasProfiles = results.profiles.length > 0 || isLoading.profiles

    if (hasEvents && !hasProfiles) {
      queueMicrotask(() => setActiveTab('events'))
    }
    else if (!hasEvents && hasProfiles) {
      queueMicrotask(() => setActiveTab('profiles'))
    }
    else if (hasEvents && hasProfiles) {
      queueMicrotask(() => setActiveTab('events'))
    }
  }, [results.events.length, results.profiles.length, isLoading.events, isLoading.profiles])

  function handleQueryChange(newQuery: string) {
    setQuery(newQuery)
  }

  function clearSearch() {
    setQuery('')
    setResults({ events: [], profiles: [] })
    setShowResults(false)
    setActiveTab('events')
  }

  function hideResults() {
    setShowResults(false)
  }

  function handleSetActiveTab(tab: 'events' | 'profiles') {
    setActiveTab(tab)
  }

  return {
    query,
    results,
    isLoading,
    showResults,
    activeTab,
    handleQueryChange,
    clearSearch,
    hideResults,
    setActiveTab: handleSetActiveTab,
  }
}
