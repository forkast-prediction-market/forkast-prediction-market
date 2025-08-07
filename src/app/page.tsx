'use client'

import type { EventCategory } from '@/types'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useLayoutEffect, useState } from 'react'
import EventGrid from '@/components/event/EventGrid'
import FilterToolbar from '@/components/layout/FilterToolbar'

function HomePageContent() {
  const searchParams = useSearchParams()
  const categoryFromURL = searchParams?.get('category') || 'trending'

  const [activeCategory, setActiveCategory] = useState<EventCategory>((categoryFromURL as EventCategory) || 'trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [favoriteMarkets, setFavoriteMarkets] = useState<Set<string>>(() => new Set())

  // Update category when URL params change
  useLayoutEffect(() => {
    if (categoryFromURL) {
      setActiveCategory(categoryFromURL as EventCategory)
    }
  }, [categoryFromURL])

  // Load favorites from localStorage on mount
  useLayoutEffect(() => {
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME!.toLowerCase()
    const stored = localStorage.getItem(`${siteName}-favorites`)
    if (stored) {
      try {
        const favArray = JSON.parse(stored)
        setFavoriteMarkets(new Set(favArray))
      }
      catch (error) {
        console.error('Error loading favorites:', error)
      }
    }
  }, [])

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME!.toLowerCase()
    localStorage.setItem(
      `${siteName}-favorites`,
      JSON.stringify(Array.from(favoriteMarkets)),
    )
  }, [favoriteMarkets])

  function handleToggleFavorite(eventId: string) {
    setFavoriteMarkets((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      }
      else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  function handleToggleFavoritesFilter() {
    setShowFavoritesOnly(!showFavoritesOnly)
  }

  return (
    <>
      <FilterToolbar
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavorites={handleToggleFavoritesFilter}
      />

      <EventGrid
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        showFavoritesOnly={showFavoritesOnly}
        favoriteMarkets={favoriteMarkets}
        onToggleFavorite={handleToggleFavorite}
      />
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}
