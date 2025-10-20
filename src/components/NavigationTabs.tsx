'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import NavigationTab from '@/components/NavigationTab'
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
}

export default function NavigationTabs({ tags, childParentMap }: NavigationTabsProps) {
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({
    left: 0,
    width: 0,
    isInitialized: false,
  })

  if (tabRefs.current.length !== tags.length) {
    tabRefs.current = Array.from({ length: tags.length }).fill(null) as (HTMLAnchorElement | null)[]
  }

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

  const updateIndicatorPosition = useCallback(() => {
    if (activeTabIndex === -1 || !tabRefs.current[activeTabIndex] || !containerRef.current) {
      return
    }

    const activeTab = tabRefs.current[activeTabIndex]
    const container = containerRef.current

    if (activeTab) {
      const tabRect = activeTab.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      const left = tabRect.left - containerRect.left + container.scrollLeft
      const width = tabRect.width

      setIndicatorStyle({
        left,
        width,
        isInitialized: true,
      })
    }
  }, [activeTabIndex])

  useLayoutEffect(() => {
    updateIndicatorPosition()
  }, [updateIndicatorPosition, tags])

  useEffect(() => {
    let attempts = 0
    const maxAttempts = 10

    function tryUpdatePosition() {
      if (activeTabIndex !== -1 && tabRefs.current[activeTabIndex]) {
        updateIndicatorPosition()
      }
      else if (attempts < maxAttempts) {
        attempts++
        requestAnimationFrame(tryUpdatePosition)
      }
    }

    requestAnimationFrame(tryUpdatePosition)
  }, [updateIndicatorPosition, activeTabIndex])

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

        {indicatorStyle.isInitialized && (
          <div
            className="absolute bottom-0 h-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}
      </div>
    </nav>
  )
}
