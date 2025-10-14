'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import NavigationTab from '@/components/layout/NavigationTab'
import { Skeleton } from '@/components/ui/skeleton'

interface NavigationTabsProps {
  tags: Array<{
    slug: string
    name: string
    childs: Array<{ name: string, slug: string }>
  }>
  childParentMap: Record<string, string>
}

interface IndicatorStyle {
  left: number
  width: number
  isInitialized: boolean
  shouldAnimate: boolean
}

export default function NavigationTabs({ tags, childParentMap }: NavigationTabsProps) {
  // Create refs array to track tab elements
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  // Reduced motion preference detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Sliding indicator state
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({
    left: 0,
    width: 0,
    isInitialized: false,
    shouldAnimate: false,
  })

  // Initialize refs array with correct length
  if (tabRefs.current.length !== tags.length) {
    tabRefs.current = Array.from({ length: tags.length }).fill(null) as (HTMLAnchorElement | null)[]
  }

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    function handleChange(e: MediaQueryListEvent) {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Active tab detection logic (replicated from NavigationTab)
  const showBookmarkedOnly = searchParams?.get('bookmarked') === 'true'
  const tagFromURL = showBookmarkedOnly && searchParams?.get('tag') === 'trending'
    ? ''
    : searchParams?.get('tag') || 'trending'
  const contextFromURL = searchParams?.get('context') ?? undefined

  function getActiveTabIndex() {
    return tags.findIndex((tag) => {
      const parentSlug = childParentMap[tagFromURL]
      const hasChildMatch = tag.childs.some(child => child.slug === tagFromURL)
      const effectiveParent = contextFromURL ?? (parentSlug ?? (hasChildMatch ? tag.slug : tagFromURL))
      return effectiveParent === tag.slug
    })
  }

  const activeTabIndex = getActiveTabIndex()

  function updateIndicatorPosition() {
    if (activeTabIndex === -1 || !tabRefs.current[activeTabIndex] || !containerRef.current) {
      return
    }

    const activeTab = tabRefs.current[activeTabIndex]
    const container = containerRef.current

    if (activeTab) {
      const tabRect = activeTab.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Account for container scroll offset for horizontal scrolling
      const left = tabRect.left - containerRect.left + container.scrollLeft
      const width = tabRect.width

      setIndicatorStyle(prev => ({
        left,
        width,
        isInitialized: true,
        shouldAnimate: prev.isInitialized, // Only animate after first initialization
      }))
    }
  }

  useLayoutEffect(() => {
    // Update position when active tab changes
    updateIndicatorPosition()
  }, [activeTabIndex, tags])

  // Handle window resize and container scroll events
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout

    function debouncedUpdatePosition() {
      updateIndicatorPosition()
    }

    function handleResize() {
      // Clear existing timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }

      // Debounce resize calculations to prevent performance issues
      resizeTimeout = setTimeout(() => {
        debouncedUpdatePosition()
      }, 150) // 150ms debounce delay
    }

    function handleScroll() {
      if (indicatorStyle.isInitialized) {
        updateIndicatorPosition()
      }
    }

    // Add event listeners
    window.addEventListener('resize', handleResize)

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    }

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize)
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
    }
  }, [activeTabIndex, indicatorStyle.isInitialized])

  return (
    <nav className="sticky top-14 z-10 border-b bg-background">
      <div
        ref={containerRef}
        className="relative container scrollbar-hide flex gap-6 overflow-x-auto py-1 text-sm font-medium"
      >
        {tags.map((tag, index) => (
          <div key={tag.slug} className="flex items-center">
            <Suspense fallback={<Skeleton className="h-8 w-16 rounded" />}>
              <NavigationTab
                tag={tag}
                childParentMap={childParentMap}
                isActive={index === activeTabIndex}
                ref={(el: HTMLAnchorElement | null) => {
                  tabRefs.current[index] = el
                }}
              />
            </Suspense>

            {index === 1 && <div className="mr-0 ml-6 h-4 w-px bg-border" />}
          </div>
        ))}

        {/* Sliding indicator */}
        {indicatorStyle.isInitialized && (
          <div
            className={`absolute bottom-0 h-0.5 rounded-full bg-primary ${
              indicatorStyle.shouldAnimate && !prefersReducedMotion ? 'transition-all duration-300 ease-out' : ''
            }`}
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              transform: `translateX(0px)`,
            }}
          />
        )}
      </div>
    </nav>
  )
}
